import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const ELEVEN_API = "https://api.elevenlabs.io/v1/text-to-speech";

interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
  optimize_streaming_latency?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { 
      text, 
      voiceId, 
      modelId, 
      outputFormat,
      optimize_streaming_latency 
    }: TTSRequest = await req.json();

    // Validate required fields
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ELEVENLABS_API_KEY is not configured");
      return NextResponse.json(
        { error: "TTS service not configured" },
        { status: 503 }
      );
    }

    // Set defaults
    const _voice = voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Default Rachel voice
    const _model = modelId || process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2_5";
    const _format = outputFormat || "mp3";
    const _latency = optimize_streaming_latency || 2;

    // Construct ElevenLabs API URL
    const url = `${ELEVEN_API}/${_voice}/stream?optimize_streaming_latency=${_latency}&output_format=${_format}`;

    console.log(`Making TTS request: voice=${_voice}, model=${_model}, format=${_format}, text_length=${text.length}`);

    // Call ElevenLabs API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        model_id: _model,
        text: text.trim(),
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key" },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: "Rate limit exceeded" },
          { status: 429 }
        );
      } else {
        return NextResponse.json(
          { error: "TTS generation failed" },
          { status: response.status }
        );
      }
    }

    // Stream the audio response
    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type": `audio/${_format}`,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
    
  } catch (error) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
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