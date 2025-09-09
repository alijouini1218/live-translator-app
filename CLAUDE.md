# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live Translator is a production-ready real-time voice translation application supporting both web and mobile platforms. The app features ultra-low latency translation (<700ms target) using OpenAI Realtime API with WebRTC, ElevenLabs TTS, automatic PTT fallback, and comprehensive billing/history management.

## Architecture

### Monorepo Structure (pnpm workspaces)
```
/apps
  /web        # Next.js 14 app (main application)
  /mobile     # Expo React Native app
/packages
  /ui         # Shared UI components with black/white/grey theme
  /core       # Types, utilities, voice maps, phrase aggregator
/infra
  supabase.sql     # Database schema
  .env.example     # Environment template
```

### Technology Stack
- **Frontend**: Next.js 14 App Router, shadcn/ui, React 18
- **Mobile**: Expo React Native with WebRTC support  
- **Real-time**: OpenAI Realtime API (WebRTC) with automatic PTT fallback
- **TTS**: ElevenLabs streaming (primary), OpenAI TTS (fallback)
- **Backend**: Supabase (Auth, Postgres, RLS), Stripe, Vercel Edge Functions
- **Styling**: Tailwind CSS with black headers/white text, light grey/black text theme

## Development Commands

### Installation
```bash
pnpm install                 # Install all dependencies
```

### Development
```bash
pnpm dev                    # Start web development server
pnpm dev:web               # Start web app only
pnpm dev:mobile            # Start mobile app (Expo)
```

### Building & Deployment  
```bash
pnpm build                 # Build web app for production
pnpm build:web            # Build web app only
```

### Code Quality
```bash
pnpm lint                 # Run ESLint across all packages
pnpm typecheck           # Run TypeScript checks
pnpm test                # Run test suites
pnpm clean              # Clean build artifacts
pnpm setup-check        # Verify environment and Supabase configuration
```

## Environment Variables

### Required Server Environment (.env)
```bash
OPENAI_API_KEY=          # OpenAI API key (server-only)
ELEVENLABS_API_KEY=      # ElevenLabs API key (server-only)
SUPABASE_SERVICE_ROLE=   # Supabase service role key
STRIPE_SECRET_KEY=       # Stripe secret key
STRIPE_WEBHOOK_SECRET=   # Stripe webhook endpoint secret
```

### Required Public Environment
```bash
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
APP_BASE_URL=https://yourapp.com
```

### Optional Configuration
```bash
OPENAI_REALTIME_MODEL=gpt-4o-realtime
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
ELEVENLABS_DEFAULT_VOICE_ID=
```

## Key Components & Systems

### Translation Modes
1. **Live Mode (Primary)**: WebRTC-based real-time translation using OpenAI Realtime API
2. **PTT Mode (Fallback)**: HTTP pipeline with VAD chunking (STT → Translate → TTS)
3. **Auto-switching**: Automatically switches to PTT when RTT > 250ms or on WebRTC errors

### Core Features
- **Authentication**: Supabase Auth with magic links and RLS policies
- **Billing**: Stripe subscriptions with automatic plan updates via webhooks
- **History**: Optional transcript storage with privacy-first design (default: OFF)
- **Export**: Multiple formats (.txt, .json, .csv) with flexible options
- **TTS**: Smart phrase aggregation with ducking/barge-in functionality
- **VAD**: Voice Activity Detection for intelligent audio chunking

### API Routes
- `GET /api/ephemeral-session` - OpenAI Realtime session creation
- `POST /api/tts` - ElevenLabs TTS streaming proxy (Edge)
- `POST /api/ptt` - PTT pipeline (STT → Translate → TTS)
- `POST /api/checkout` - Stripe checkout session creation
- `POST /api/stripe-webhook` - Stripe webhook handler for plan updates

## Database Schema

Uses Supabase with RLS policies:
- `profiles` - User profiles with plan information
- `sessions` - Translation sessions with metadata
- `transcripts` - Translation segments linked to sessions

## Security Best Practices

- **No client secrets**: API keys only in server environment
- **RLS policies**: All database access uses Row Level Security
- **Privacy-first**: History disabled by default, explicit user consent required
- **Webhook validation**: Stripe webhooks use signature verification
- **CORS protection**: API routes have proper CORS configuration

## Performance Requirements

### Target Metrics
- **<700ms**: First audible translation output
- **<250ms**: WebRTC RTT threshold for auto-switching
- **95%+**: Successful Realtime connections on good networks
- **<2s**: Total PTT pipeline latency

### Optimization Features
- Edge runtime for TTS streaming
- Audio ducking for natural conversation flow
- Phrase aggregation to avoid partial speech
- VAD-based intelligent audio chunking
- Connection quality monitoring with auto-fallback

## Testing

### Test Categories
- **Auth Flow**: Magic link authentication and session management
- **Billing**: Stripe checkout and webhook processing
- **Translation**: E2E live translation and PTT fallback
- **History**: Session storage and export functionality

### Running Tests
```bash
pnpm test              # Run all tests
pnpm test:web         # Web app tests only
pnpm test:unit        # Unit tests only
pnpm test:e2e         # End-to-end tests only
```

## Mobile Development

### Expo Configuration
- Uses Expo SDK with React Native WebRTC
- Shared components from packages/ui adapted for native
- Environment variables via app config
- Development build required for WebRTC functionality

### Mobile-Specific Features
- Native audio permissions management
- Platform-specific voice activity detection
- iOS Safari compatibility (≥16.4 required)
- Touch-optimized UI components

## Deployment

### Vercel Deployment
1. Set environment variables in Vercel dashboard
2. Connect repository with automatic deployments
3. Configure custom domain if needed
4. Monitor performance via Vercel Analytics

### Supabase Setup
1. Create new Supabase project
2. Run SQL schema from `/infra/supabase.sql`
3. Configure RLS policies
4. Set up authentication providers

### Stripe Configuration  
1. Create products and pricing in Stripe Dashboard
2. Set up webhook endpoint: `/api/stripe-webhook`
3. Configure customer portal
4. Test subscription flows

## Common Issues & Solutions

### WebRTC Connection Issues
- Check firewall and NAT configuration
- Verify HTTPS requirement for microphone access
- Monitor RTT and auto-switch to PTT if needed

### Audio Permission Problems
- Ensure HTTPS in production
- Handle permission denied gracefully
- Provide clear user instructions

### Build Failures
- Verify Node.js version compatibility (≥18.0.0)
- Clear cache: `pnpm clean && pnpm install`
- Check TypeScript errors: `pnpm typecheck`

## Development Workflow

1. **Feature Development**: Create feature branches from main
2. **Testing**: Run full test suite before commits
3. **Code Quality**: ESLint and Prettier enforced via Husky
4. **Type Safety**: TypeScript strict mode enabled
5. **Documentation**: Update relevant docs with changes
6. **Deployment**: Automatic deployment on main branch merge