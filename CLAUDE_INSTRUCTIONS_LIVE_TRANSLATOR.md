# Claude Build Instructions & Plan — Live Translator (Web + Mobile)

> **TL;DR:** Claude, scaffold a web+mobile *live* translator using OpenAI Realtime (WebRTC), ElevenLabs TTS, Supabase Auth/RLS, Stripe subs, on Vercel. Ship live mode + PTT fallback.

---

## 1) Operating Contract (for Claude Code)

- **Mode:** You are Lead Engineer. Work iteratively. Each step outputs *only* the relevant diffs/new files and short notes.
- **Ask at most 2 clarifying questions** when a blocker appears; otherwise proceed with sensible defaults.
- **No secrets in client code.** Read env via server routes; use placeholders. Supabase/Stripe via MCP; OpenAI + ElevenLabs keys set in server env.
- **TypeScript-first.** Strict mode. ESLint + Prettier.
- **Low-latency first.** Prioritize the WebRTC path; ship PTT fallback for devices where WebRTC is brittle.
- **Definition of Done (DoD):**
  - Live translation works E2E on Chrome + iOS Safari (≥16.4) with <700ms first audible output (good network).
  - Stripe Pro upgrades flip `profiles.plan` via webhook.
  - Optional history toggle stores segments; default is **off**.
  - Consent UI, live mic indicator, Stop always visible.
  - Basic tests for auth, checkout, and live session flow.
- **Deliverables style:** Clear commit messages, small atomic PRs, runnable instructions for each milestone.

---

## 2) Tech & Services

- **Frontend Web:** Next.js 14 (App Router), shadcn/ui, AudioWorklet.
- **Mobile:** React Native (Expo), `react-native-webrtc`, `expo-av`.
- **Realtime:** OpenAI Realtime (WebRTC) → partial transcripts only.
- **TTS:** ElevenLabs streaming (`/api/tts` Edge route). Fallback to OpenAI TTS if needed.
- **Auth/DB:** Supabase (Auth, RLS, Postgres).
- **Billing:** Stripe Checkout + Customer Portal.
- **Hosting:** Vercel (web + API routes).
- **MCP:** Use available MCPs for Supabase/Stripe/Vercel. Only OpenAI/ElevenLabs keys are required in server env.

> **Security:** Do **not** embed API keys in client; never log secrets. If keys were displayed in chat earlier, assume they must be rotated.

---

## 3) Repository Layout (pnpm workspaces)

```
/live-translator
  /apps
    /web        # Next.js app
    /mobile     # Expo RN app
  /packages
    /ui         # shared UI (web components + tokens)
    /core       # types, voice maps, latency utils, prompt presets
  /infra
    supabase.sql
    stripe.seed.json
    .env.example
pnpm-workspace.yaml
```

---

## 4) Environment & Config

Server (`.env` on Vercel):
```
OPENAI_API_KEY= # set on server only
OPENAI_REALTIME_MODEL=gpt-4o-realtime

NEXT_PUBLIC_SUPABASE_URL= # via MCP or value
SUPABASE_ANON_KEY=        # via MCP or value
SUPABASE_SERVICE_ROLE=    # via MCP or value

STRIPE_SECRET_KEY=        # via MCP or value
STRIPE_WEBHOOK_SECRET=    # via MCP or value
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # via MCP or value

ELEVENLABS_API_KEY=       # server only
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
ELEVENLABS_DEFAULT_VOICE_ID= # optional
APP_BASE_URL=https://yourapp.com
```

Mobile (`.env.mobile` or app config):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_STRIPE_PK=...
API_BASE_URL=https://yourapp.com
OPENAI_REALTIME_MODEL=gpt-4o-realtime
```

---

## 5) Supabase Schema (run in SQL editor)

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free',
  display_name text,
  created_at timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_lang text,
  target_lang text not null,
  mode text not null, -- 'live' | 'ptt'
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_ms bigint,
  characters int default 0,
  cost_cents int default 0
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  t0_ms int not null,
  t1_ms int not null,
  source_text text,
  target_text text
);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.transcripts enable row level security;

create policy if not exists "own_profile"
on public.profiles for select using (auth.uid() = id);

create policy if not exists "own_profile_update"
on public.profiles for update using (auth.uid() = id);

create policy if not exists "own_sessions"
on public.sessions for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "own_transcripts"
on public.transcripts for all using (
  exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid())
)
with check (exists (select 1 from public.sessions s where s.id = session_id and s.user_id = auth.uid()));
```

---

## 6) Implementation Milestones (Claude, do in order)

### M0 — Scaffold & Tooling
- Init monorepo (pnpm). Add Next.js app, Expo app, packages/ui, packages/core.
- Add TypeScript strict, ESLint, Prettier, Husky pre-commit.
- Commit: `chore: scaffold monorepo, tooling, CI`

### M1 — Auth + DB
- Connect Supabase Auth (magic link). Create SQL schema above.
- Add RLS policies. Build `/app` gated route and `/history` placeholder.
- Commit: `feat(auth): supabase auth, profiles table, gated routes`

### M2 — Billing
- Add `/billing` with Stripe Checkout button and Portal link.
- Implement `/api/checkout` and `/api/stripe-webhook` to flip `profiles.plan`.
- Commit: `feat(billing): checkout + webhook + portal`

### M3 — Realtime (OpenAI) + UI
- Implement `/api/ephemeral-session` route.
- Web client: WebRTC connect → receive partial transcript events (datachannel).
- Build live UI: waveform, captions (source), translated captions (target), Start/Stop.
- Commit: `feat(rt): openai realtime webrtc connect + live ui`

### M4 — TTS (ElevenLabs) + Playback
- Add `/api/tts` (Edge) streaming proxy. Language→voice map in `packages/core`.
- Debounce partials; speak only phrase-final chunks (., !, ? or 900ms pause).
- Implement ducking/barge-in: fade out current sound when user resumes speech.
- Commit: `feat(tts): elevenlabs streaming + phrase aggregator + barge-in`

### M5 — PTT Fallback (HTTP pipeline)
- Add VAD-chunked HTTP route: receive PCM chunks → STT (gpt-4o-mini-transcribe) → translate (gpt-4o) → TTS → stream back.
- Auto-switch to PTT when RTT > 250ms or WebRTC errors.
- Commit: `feat(fallback): ptt http streaming pipeline + autoswitch`

### M6 — History (opt-in) + Export
- Toggle to save segments. Persist to `transcripts` with timestamps and char counts.
- `/history` list + export (.txt). Delete session.
- Commit: `feat(history): opt-in save + export + delete`

### M7 — Polish & QA
- Consent banner, mic indicator, keyboard shortcuts.
- Latency meter + basic analytics (session latency, drops, phrase count).
- Tests: auth smoke, checkout webhook, realtime connect happy path.
- Commit: `chore(qA): polish ui, metrics, tests`

---

## 7) Backend Route Stubs (expand as needed)

### `GET /api/ephemeral-session`
```ts
// apps/web/app/api/ephemeral-session/route.ts
import OpenAI from "openai";
import { NextResponse } from "next/server";

export async function GET() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  const session = await client.realtime.sessions.create({
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime",
    // instructions can include system hints for translation behavior
  });
  return NextResponse.json(session);
}
```

### `POST /api/tts` (Edge) — ElevenLabs streaming
```ts
// apps/web/app/api/tts/route.ts
import { NextRequest } from "next/server";
export const runtime = "edge";
const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";

export async function POST(req: NextRequest) {
  const { text, voiceId, modelId, outputFormat } = await req.json();
  const _voice = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "default";
  const _model = modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
  const _fmt = outputFormat || "mp3";

  const r = await fetch(`${ELEVEN_API}/${_voice}/stream?optimize_streaming_latency=2&output_format=${_fmt}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVENLABS_API_KEY!
    },
    body: JSON.stringify({ model_id: _model, text })
  });

  return new Response(r.body, {
    status: r.status,
    headers: { "Content-Type": `audio/${_fmt}`, "Cache-Control": "no-store" }
  });
}
```

### Stripe Handlers
- `/api/checkout` → create session (mode: subscription).
- `/api/stripe-webhook` → update `profiles.plan` (created/updated/deleted).

---

## 8) Frontend Hooks & Utilities

**Phrase aggregator (emit less noisy TTS):**
```ts
let buffer = "";
let lastEmit = 0;

export function onPartialTranscript(part: string, speak: (t: string) => void) {
  buffer += part;
  const now = performance.now();
  const emit = /[.!?…]$/.test(buffer.trim()) || now - lastEmit > 900;
  if (emit) {
    const text = buffer.trim();
    buffer = "";
    lastEmit = now;
    if (text) speak(text);
  }
}
```

**Language → Voice map (fill your voice IDs):**
```ts
export const languageToVoice: Record<string, string> = {
  en: "", fr: "", de: "", es: "", ja: ""
};
```

---

## 9) System Prompt for Realtime Session

```
You are a simultaneous interpreter. Translate from {detected or selected source} to {target}.
Constraints:
- Emit very short, punctuated phrases (~0.5–1.5s).
- Preserve proper nouns; keep numbers as digits.
- If uncertain, correct in the next chunk rather than stalling.
- Avoid filler; do not re-translate already emitted content.
- Honor provided glossary (key:value) if any.
```

---

## 10) Run & Build Instructions

**Root:**
```bash
pnpm i
```

**Web:**
```bash
cd apps/web
pnpm dev    # Next.js
```

**Mobile (Expo):**
```bash
cd apps/mobile
pnpm start  # Expo dev client
```

**Vercel deploy (web + routes):**
```bash
# ensure env vars set in Vercel dashboard
vercel --prod
```

---

## 11) Acceptance Criteria (V1)

- 95%+ successful Realtime connects on good networks.
- Median time-to-first audible translation < 700ms (web).
- At least 4 language pairs verified (live + PTT).
- Stripe Pro upgrades change `profiles.plan` reliably.
- Privacy & consent copy shipped; history off by default.

---

## 12) Open Questions (ask only if blocking)

1) Default target languages and voice IDs for ElevenLabs per locale?
2) Do we enable anonymous trial, or force sign-in before live mode?
