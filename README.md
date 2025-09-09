# Live Translator App

A production-ready real-time voice translation application supporting both web and mobile platforms.

## Features

- Ultra-low latency translation (<700ms target) 
- OpenAI Realtime API with WebRTC
- ElevenLabs TTS integration
- Automatic PTT fallback
- Comprehensive billing/history management

## Deployment Status

Latest deployment fixes:
- Added pnpm-lock.yaml for proper workspace dependency resolution
- Updated vercel.json with framework and rootDirectory configuration
- Added .nvmrc for Node.js version consistency

## Quick Start

```bash
pnpm install
pnpm dev
```

Visit the [deployment](https://live-translator-app.vercel.app) to see the live app.