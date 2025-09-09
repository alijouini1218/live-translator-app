# Vercel Environment Variables Setup

Quick reference for setting up environment variables in Vercel for the Live Translator App deployment.

## Required Environment Variables

Copy these exact variable names and values to your Vercel project settings:

### Database & Authentication
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
SUPABASE_SERVICE_ROLE=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here
```

### AI Services
```
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_REALTIME_MODEL=gpt-4o-realtime
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
ELEVENLABS_DEFAULT_VOICE_ID=pNInz6obpgDQGcFmaJgB
```

### Payment Processing
```
STRIPE_SECRET_KEY=sk_your_stripe_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_your_stripe_publishable_key_here
STRIPE_PRO_MONTHLY_PRICE_ID=price_your_monthly_price_id
STRIPE_PRO_YEARLY_PRICE_ID=price_your_yearly_price_id
```

### Application
```
APP_BASE_URL=https://your-domain.vercel.app
```

## How to Set Variables in Vercel

1. Go to your project in [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project name
3. Go to **Settings** tab
4. Click **Environment Variables** in the sidebar
5. For each variable:
   - **Name**: Copy the exact name from above (e.g., `OPENAI_API_KEY`)
   - **Value**: Enter your actual value (e.g., `sk-actual-key-here`)
   - **Environments**: Select `Production`, `Preview`, and `Development`
   - Click **Save**

## Environment-Specific Values

### Production
```
APP_BASE_URL=https://your-custom-domain.com
STRIPE_SECRET_KEY=sk_live_...  (use live keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  (use live keys)
```

### Preview/Development
```
APP_BASE_URL=https://your-project-git-branch.vercel.app
STRIPE_SECRET_KEY=sk_test_...  (use test keys)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  (use test keys)
```

## Important Notes

- **NEVER** commit actual API keys to your repository
- Use **test** Stripe keys for preview/development environments
- Use **live** Stripe keys only for production
- The `NEXT_PUBLIC_` prefix makes variables available to the browser
- All other variables are server-side only for security

## Verification

After setting variables, redeploy your app and check:

1. **Functions tab** - Should show no environment variable errors
2. **Runtime logs** - Check for any missing variable warnings
3. **App functionality** - Test authentication, translation, and billing

## Quick Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Production uses live Stripe keys
- [ ] APP_BASE_URL matches your domain
- [ ] Webhook URL configured in Stripe dashboard
- [ ] Supabase allows your Vercel domain in auth settings
- [ ] OpenAI API has sufficient credits/limits
- [ ] ElevenLabs subscription can handle expected usage