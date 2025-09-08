import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

export const runtime = "edge";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";

interface PTTRequest {
  audio: string; // Base64 encoded audio data
  sourceLanguage: string;
  targetLanguage: string;
  audioFormat?: 'mp3' | 'webm' | 'wav' | 'pcm';
  voiceId?: string;
  modelId?: string;
}

interface TranslationPrompt {
  sourceLanguage: string;
  targetLanguage: string;
  text: string;
}

// Language code mappings for OpenAI Whisper
const getWhisperLanguageCode = (lang: string): string => {
  const langMap: Record<string, string> = {
    'auto': 'auto',
    'en': 'en',
    'es': 'es', 
    'fr': 'fr',
    'de': 'de',
    'it': 'it',
    'pt': 'pt',
    'ru': 'ru',
    'ja': 'ja',
    'ko': 'ko',
    'zh': 'zh',
    'ar': 'ar',
    'hi': 'hi',
    'nl': 'nl',
    'sv': 'sv',
    'no': 'no',
    'da': 'da',
    'fi': 'fi',
    'pl': 'pl',
    'tr': 'tr',
  };
  return langMap[lang] || lang;
};

// Get translation prompt for different language pairs
const getTranslationPrompt = ({ sourceLanguage, targetLanguage, text }: TranslationPrompt): string => {
  const sourceLangName = getLanguageName(sourceLanguage);
  const targetLangName = getLanguageName(targetLanguage);

  return `You are a professional simultaneous interpreter. Translate the following ${sourceLangName} text to ${targetLangName}. 
  
Rules:
1. Provide ONLY the translation, no explanations or additional text
2. Maintain the original tone and context
3. Keep cultural nuances when possible
4. If the text is incomplete, translate what you can understand
5. If you cannot determine the source language, detect it first then translate

Text to translate: "${text}"

Translation:`;
};

const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    'auto': 'Auto-detected',
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French', 
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'tr': 'Turkish',
  };
  return names[code] || code.toUpperCase();
};

export async function POST(req: NextRequest) {
  console.log('PTT API request received');
  
  try {
    const startTime = Date.now();
    
    const { 
      audio, 
      sourceLanguage, 
      targetLanguage, 
      audioFormat = 'mp3',
      voiceId,
      modelId 
    }: PTTRequest = await req.json();

    // Validate required fields
    if (!audio || !sourceLanguage || !targetLanguage) {
      return NextResponse.json(
        { error: "Audio data, source language, and target language are required" },
        { status: 400 }
      );
    }

    // Check API keys
    const openaiApiKey = process.env.OPENAI_API_KEY;
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "STT service not configured" },
        { status: 503 }
      );
    }

    if (!elevenlabsApiKey) {
      console.error("ELEVENLABS_API_KEY is not configured"); 
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 503 }
      );
    }

    console.log(`Processing PTT request: ${sourceLanguage} -> ${targetLanguage}, format: ${audioFormat}`);

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Step 1: Speech-to-Text using OpenAI Whisper
    console.log('Step 1: Running STT with Whisper');
    const sttStartTime = Date.now();
    
    // Convert base64 audio to Buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Create a File object for Whisper API
    const audioFile = new File([audioBuffer], `audio.${audioFormat}`, {
      type: `audio/${audioFormat}`
    });

    const whisperLanguage = getWhisperLanguageCode(sourceLanguage);
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
      language: whisperLanguage === 'auto' ? undefined : whisperLanguage,
      response_format: 'text',
      temperature: 0.2,
    });

    const sttLatency = Date.now() - sttStartTime;
    console.log(`STT completed in ${sttLatency}ms. Transcription: "${transcription}"`);

    if (!transcription || transcription.trim().length === 0) {
      return NextResponse.json(
        { error: "No speech detected in audio" },
        { status: 400 }
      );
    }

    // Step 2: Translation using GPT-4o
    console.log('Step 2: Running translation with GPT-4o');
    const translationStartTime = Date.now();
    
    const translationPrompt = getTranslationPrompt({
      sourceLanguage,
      targetLanguage, 
      text: transcription
    });

    const translation = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: translationPrompt }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const translatedText = translation.choices[0]?.message?.content?.trim();
    const translationLatency = Date.now() - translationStartTime;
    console.log(`Translation completed in ${translationLatency}ms. Result: "${translatedText}"`);

    if (!translatedText) {
      return NextResponse.json(
        { error: "Translation failed" },
        { status: 500 }
      );
    }

    // Step 3: Text-to-Speech using ElevenLabs
    console.log('Step 3: Running TTS with ElevenLabs');
    const ttsStartTime = Date.now();
    
    const voice = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
    const model = modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
    const outputFormat = "mp3";
    const optimizeLatency = 4; // Maximum optimization for PTT

    const ttsUrl = `${ELEVEN_API}/${voice}/stream?optimize_streaming_latency=${optimizeLatency}&output_format=${outputFormat}`;

    const ttsResponse = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": elevenlabsApiKey,
      },
      body: JSON.stringify({
        model_id: model,
        text: translatedText,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error(`ElevenLabs API error: ${ttsResponse.status} - ${errorText}`);
      return NextResponse.json(
        { error: "TTS generation failed" },
        { status: ttsResponse.status }
      );
    }

    const ttsLatency = Date.now() - ttsStartTime;
    const totalLatency = Date.now() - startTime;
    
    console.log(`TTS completed in ${ttsLatency}ms. Total pipeline latency: ${totalLatency}ms`);

    // Return the audio stream with metadata headers
    return new Response(ttsResponse.body, {
      status: 200,
      headers: {
        "Content-Type": `audio/${outputFormat}`,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        // Add custom headers with pipeline metrics
        "X-STT-Latency": sttLatency.toString(),
        "X-Translation-Latency": translationLatency.toString(), 
        "X-TTS-Latency": ttsLatency.toString(),
        "X-Total-Latency": totalLatency.toString(),
        "X-Source-Text": Buffer.from(transcription).toString('base64'),
        "X-Target-Text": Buffer.from(translatedText).toString('base64'),
      },
    });

  } catch (error) {
    console.error("PTT API error:", error);
    
    let errorMessage = "Internal server error";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        errorMessage = "Invalid API key";
        statusCode = 401;
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = "Rate limit exceeded"; 
        statusCode = 429;
      } else if (error.message.includes('audio') || error.message.includes('format')) {
        errorMessage = "Invalid audio format";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}