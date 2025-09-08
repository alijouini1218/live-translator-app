import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase/database.types'
import { generateRealtimeSystemPrompt } from '@live-translator/core'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ 
      cookies: () => cookieStore 
    })
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters for translation configuration
    const { searchParams } = new URL(request.url)
    const sourceLanguage = searchParams.get('source_lang') || 'auto'
    const targetLanguage = searchParams.get('target_lang') || 'en'
    const context = searchParams.get('context') || 'CASUAL_CONVERSATION'

    // Generate system prompt for the translation task
    const systemPrompt = generateRealtimeSystemPrompt(
      sourceLanguage === 'auto' ? 'detected language' : sourceLanguage,
      targetLanguage
    )

    // Create realtime session
    const session = await openai.realtime.sessions.create({
      model: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview',
      voice: 'alloy',
      instructions: systemPrompt,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: {
        model: 'whisper-1',
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      },
      temperature: 0.3,
      max_response_output_tokens: 4096,
    })

    // Log session creation for debugging
    console.log('Created OpenAI Realtime session:', {
      sessionId: session.id,
      sourceLanguage,
      targetLanguage,
      userId: user.id,
    })

    return NextResponse.json({
      session_id: session.id,
      client_secret: session.client_secret,
      expires_at: session.expires_at,
      voice: session.voice,
      turn_detection: session.turn_detection,
    })
  } catch (error: any) {
    console.error('Failed to create ephemeral session:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to create session',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}