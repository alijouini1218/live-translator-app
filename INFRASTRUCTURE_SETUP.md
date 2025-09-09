# Infrastructure Setup Guide

This guide walks you through setting up the complete infrastructure for the Live Translator App, including Supabase, environment variables, and deployment configuration.

## Prerequisites

- Node.js ≥18.0.0
- pnpm ≥8.0.0
- OpenAI API account
- ElevenLabs API account
- Stripe account
- Vercel account (for deployment)

## 1. Supabase Setup

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/new)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `live-translator` (or your preferred name)
   - **Database Password**: Generate a secure password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier
4. Click "Create new project" and wait for setup to complete (~2 minutes)

### Step 2: Get Supabase Credentials

1. Once project is created, go to **Settings → API**
2. Copy the following values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)

### Step 3: Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the entire contents of `/infra/supabase.sql`
3. Paste into the SQL Editor and click "Run"
4. Verify tables were created by checking **Database → Tables**

You should see:
- `profiles` - User profile data
- `sessions` - Translation session records  
- `transcripts` - Individual translation segments

### Step 4: Configure Authentication

1. Go to **Authentication → Settings**
2. Under **Site URL**, add your domains:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Under **Redirect URLs**, add:
   - Development: `http://localhost:3000/auth/callback`
   - Production: `https://your-domain.com/auth/callback`
4. Enable **Email** provider (enabled by default)
5. Configure **SMTP** settings for production email delivery

## 2. Environment Variables Setup

### Step 1: Development Environment

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual values in `.env.local`:

```bash
# Supabase (from Step 2 above)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here

# OpenAI (get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-your_openai_api_key_here

# ElevenLabs (get from https://elevenlabs.io/app/settings/api-keys)  
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_PRO_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_PRO_YEARLY_PRICE_ID=price_your_yearly_price_id

# App Configuration
APP_BASE_URL=http://localhost:3000
```

### Step 2: Mobile Environment (Optional)

If developing the mobile app, create `apps/mobile/.env.local`:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_STRIPE_PK=pk_test_your_stripe_publishable_key
API_BASE_URL=http://localhost:3000
```

## 3. API Keys Setup

### OpenAI API Key

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Name it "Live Translator" and copy the key
4. **Important**: You need access to GPT-4o Realtime API (currently in limited preview)

### ElevenLabs API Key  

1. Go to [ElevenLabs API Settings](https://elevenlabs.io/app/settings/api-keys)
2. Copy your API key
3. Note: Free tier has limited characters per month

### Stripe Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Get your **Publishable** and **Secret** keys from **Developers → API Keys**
3. Create products and prices:
   - Pro Monthly: ~$19.99/month
   - Pro Yearly: ~$199.99/year  
4. Copy the Price IDs for your environment variables

## 4. Stripe Webhook Setup

### Development Webhook (using Stripe CLI)

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login: `stripe login`
3. Forward events to localhost:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe-webhook
   ```
4. Copy the webhook signing secret (`whsec_...`) to `STRIPE_WEBHOOK_SECRET`

### Production Webhook

1. In Stripe Dashboard, go to **Developers → Webhooks**
2. Click "Add endpoint"
3. Set URL: `https://your-domain.com/api/stripe-webhook`
4. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`  
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret to your production environment

## 5. Vercel Deployment

### Step 1: Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your Git repository
4. Framework: **Next.js**
5. Root Directory: leave empty (monorepo structure is automatically detected)

### Step 2: Configure Environment Variables

In Vercel project settings, add all environment variables from `.env.local`:

**Required Variables:**
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE
OPENAI_API_KEY
ELEVENLABS_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_MONTHLY_PRICE_ID
STRIPE_PRO_YEARLY_PRICE_ID
APP_BASE_URL=https://your-domain.vercel.app
```

### Step 3: Configure Build Settings

Vercel should auto-detect the Next.js app, but verify:
- **Framework Preset**: Next.js
- **Build Command**: `pnpm vercel-build` (defined in package.json)
- **Output Directory**: leave empty (Next.js default)
- **Install Command**: `pnpm install`

## 6. Testing the Setup

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Start Development Server

```bash
pnpm dev
```

### Step 3: Test Core Features

1. **Authentication**: Sign up with email
2. **Database**: Check if profile is created in Supabase
3. **Translation**: Test voice translation (requires HTTPS for microphone)
4. **Billing**: Test Stripe checkout flow

## 7. Production Checklist

Before going live, ensure:

- [ ] All environment variables set in Vercel
- [ ] Supabase project on paid plan (if expecting traffic)
- [ ] Custom domain configured
- [ ] HTTPS enabled everywhere
- [ ] Stripe webhook endpoint configured for production
- [ ] OpenAI billing limits set appropriately
- [ ] ElevenLabs subscription plan suitable for usage
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Analytics configured (optional)

## 8. Troubleshooting

### Common Issues

**"Unauthorized" errors:**
- Check Supabase RLS policies are enabled
- Verify JWT token format
- Ensure service role key is correct

**WebRTC not working:**
- HTTPS required for microphone access
- Check firewall/NAT configuration
- Try PTT mode as fallback

**Stripe webhook failures:**
- Verify endpoint URL is accessible
- Check webhook signing secret
- Review webhook event selection

**Build failures:**
- Clear cache: `pnpm clean && pnpm install`  
- Check TypeScript errors: `pnpm typecheck`
- Verify environment variables are set

### Getting Help

- Supabase: [Discord](https://discord.supabase.com/) or [GitHub](https://github.com/supabase/supabase)
- OpenAI: [Community Forum](https://community.openai.com/)
- ElevenLabs: [Discord](https://discord.gg/elevenlabs)
- Stripe: [Support](https://support.stripe.com/)

---

**Next Steps**: Once infrastructure is set up, you can start developing and testing the Live Translator application. The development server will be available at `http://localhost:3000`.