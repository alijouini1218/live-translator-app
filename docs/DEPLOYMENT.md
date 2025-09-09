# Live Translator - Deployment Guide

This guide walks you through deploying Live Translator to Vercel with proper authentication setup.

## Prerequisites

- [Vercel account](https://vercel.com)
- [Supabase account](https://supabase.com)
- [GitHub account](https://github.com) (for git deployment)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose your organization and fill in:
   - **Project Name**: `live-translator`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for the project to be ready (2-3 minutes)

### 1.2 Configure Authentication

1. Go to **Authentication > Providers**
2. Enable **Email** provider
3. Configure email settings:
   - **Enable email confirmations**: ON (recommended for production)
   - **Enable custom SMTP**: OFF (use default for now)

### 1.3 Set up Database

1. Go to **SQL Editor**
2. Copy the contents from `/infra/supabase.sql`
3. Paste and execute the SQL
4. Verify tables were created under **Database > Tables**

### 1.4 Get API Keys

1. Go to **Settings > API**
2. Copy these values (you'll need them for Vercel):
   - **Project URL** (looks like `https://abcdef.supabase.co`)
   - **Anon public** key
   - **Service role** key (keep this secret!)

## Step 2: Vercel Deployment

### 2.1 Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `apps/web/.next`

### 2.2 Environment Variables

**CRITICAL**: Set these environment variables in Vercel before deploying:

```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here

# Application Configuration (REQUIRED)
APP_BASE_URL=https://your-app.vercel.app

# OpenAI Configuration (REQUIRED for translation)
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_REALTIME_MODEL=gpt-4o-realtime

# ElevenLabs Configuration (REQUIRED for TTS)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5

# Stripe Configuration (REQUIRED for billing)
STRIPE_SECRET_KEY=sk_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_your_stripe_publishable_key_here
```

#### How to add environment variables in Vercel:

1. In your project dashboard, go to **Settings > Environment Variables**
2. Add each variable one by one:
   - **Name**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Variable value (from Supabase dashboard)
   - **Environment**: Select all (Production, Preview, Development)
3. Click "Save"

### 2.3 Deploy

1. Click **Deploy** in Vercel
2. Wait for the build to complete
3. You should see a success message with your live URL

## Step 3: Post-Deployment Configuration

### 3.1 Update Supabase Settings

1. Go back to **Supabase Dashboard > Authentication > URL Configuration**
2. Add your Vercel URL to:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

### 3.2 Test Authentication

1. Visit your deployed app: `https://your-app.vercel.app`
2. Navigate to `/auth`
3. Enter your email address
4. Check your email for the magic link
5. Click the magic link - you should be redirected to `/app`

## Step 4: Troubleshooting

### Common Issues

#### 1. "Configuration Error" on Login

**Problem**: Missing or incorrect environment variables

**Solution**:
- Check all environment variables are set in Vercel
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Redeploy after changing environment variables

#### 2. Magic Link Redirects to Error Page

**Problem**: Supabase URL configuration

**Solution**:
- Verify **Site URL** in Supabase matches your Vercel domain
- Add your domain to **Redirect URLs**
- Ensure no trailing slashes

#### 3. "Database Error" Messages

**Problem**: Database schema not set up

**Solution**:
- Run the SQL from `/infra/supabase.sql` in Supabase SQL Editor
- Check that all tables exist in **Database > Tables**

#### 4. Build Failures

**Problem**: Missing dependencies or configuration

**Solution**:
- Ensure all environment variables are set
- Check build logs in Vercel dashboard
- Make sure Node.js version is compatible (≥18.0.0)

### Debug Mode

Use the setup check script to verify configuration:

```bash
# In your local development environment
node scripts/setup-check.js
```

This will verify:
- Environment variables are set correctly
- Supabase connection works
- Database schema is configured
- Authentication is enabled

### Monitoring

1. **Vercel Functions Logs**: Monitor authentication callbacks
2. **Supabase Logs**: Check database operations
3. **Browser DevTools**: Watch for client-side errors

## Step 5: Production Checklist

Before going live:

- [ ] All environment variables set in Vercel
- [ ] Supabase URL configuration updated
- [ ] Database schema deployed
- [ ] Authentication tested end-to-end
- [ ] Email delivery working
- [ ] Custom domain configured (optional)
- [ ] Analytics/monitoring set up
- [ ] Error tracking configured

## Security Notes

- Never commit `.env.local` or real API keys to git
- Use different Supabase projects for development/production
- Regularly rotate API keys
- Enable Supabase RLS (Row Level Security) in production
- Consider custom SMTP for email delivery

## Support

If you encounter issues:

1. Check the [troubleshooting section](#troubleshooting)
2. Run `node scripts/setup-check.js` locally
3. Review Vercel function logs for authentication errors
4. Check Supabase logs for database errors

For persistent issues, ensure you have:
- Correct Supabase project setup
- All environment variables configured
- Matching URL configurations between Vercel and Supabase