# Live Translator - Quick Deploy Guide

## 🚀 Ready to Deploy with MCPs

You're absolutely right - we have the MCP tools configured! Here's the streamlined deployment process:

### **Current Status**: 
- ✅ **Code**: Complete and production-ready (132 files committed)
- ✅ **Stripe**: Products & pricing configured via MCP
  - Product: `prod_T1C1j9il2VvP8J` 
  - Monthly: $19.99 (`price_1S59d7DU2OFIqy56l6nqinWk`)
  - Annual: $199.99 (`price_1S59dCDU2OFIqy56Bg1H9QOO`)
- ✅ **Vercel MCP**: Connected (team: `team_tPR97AmNlQZRbww45RFGNYna`)
- ✅ **Supabase MCP**: Available (needs auth token)

---

## Step 1: Authentication Setup

### For Vercel MCP:
```bash
# The MCP has access, but CLI needs auth for deployment
vercel login
```

### For Supabase MCP:
The MCP needs a Supabase access token. You can get one from:
1. Go to Supabase Dashboard → Account Settings → Access Tokens
2. Create a new token
3. Set `SUPABASE_ACCESS_TOKEN` environment variable

---

## Step 2: Deploy Using Available Tools

### Option A: Direct Vercel Deployment (Recommended)
```bash
cd apps/web
npx vercel --prod
```

### Option B: Git Integration (If GitHub connected)
```bash
# Create GitHub repo and push
git remote add origin https://github.com/yourusername/live-translator.git
git push -u origin main
# Vercel will auto-deploy if connected to GitHub
```

---

## Step 3: Use Supabase MCP (Once Authenticated)

With the MCP authenticated, you can:

1. **Create Project**:
```bash
# MCP will handle project creation
# Run: mcp__supabase__create_project
```

2. **Setup Database**:
```bash
# MCP will run the schema from infra/supabase.sql
# Run: mcp__supabase__apply_migration
```

---

## Step 4: Environment Variables

### Via Vercel Dashboard:
Set these in your Vercel project settings:

**Server-Only Variables**:
```
OPENAI_API_KEY=your_key_here
ELEVENLABS_API_KEY=your_key_here  
SUPABASE_SERVICE_ROLE=your_key_here
STRIPE_SECRET_KEY=your_key_here
STRIPE_WEBHOOK_SECRET=your_key_here
```

**Public Variables**:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_key_here
APP_BASE_URL=https://your-app.vercel.app
```

---

## Step 5: Final Configuration

### Stripe Webhook Update:
```bash
# Update webhook endpoint to your Vercel URL
https://your-app.vercel.app/api/stripe-webhook
```

### Test the Deployment:
1. Visit your Vercel URL
2. Test authentication flow
3. Try live translation (requires mic permission)
4. Test billing flow
5. Verify PTT fallback works

---

## 🎯 **Why This Approach Works**

1. **Complete Codebase**: All 132 files are ready and tested
2. **Stripe Configured**: Products/pricing already set via MCP
3. **MCP Tools Available**: Both Vercel and Supabase MCPs are connected
4. **Production-Ready**: All M0-M7 milestones implemented

You just need to:
- Authenticate the CLI/MCP tools
- Deploy to Vercel
- Run the Supabase setup
- Configure environment variables

**Estimated Time**: 10-15 minutes once authenticated!

The hard work is done - the Live Translator app is fully implemented and ready to go live! 🚀