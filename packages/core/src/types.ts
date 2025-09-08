// Core types for Live Translator

export interface Profile {
  id: string;
  plan: 'free' | 'pro';
  display_name?: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  source_lang?: string;
  target_lang: string;
  mode: 'live' | 'ptt';
  started_at: string;
  ended_at?: string;
  duration_ms?: number;
  characters: number;
  cost_cents: number;
}

export interface Transcript {
  id: string;
  session_id: string;
  t0_ms: number;
  t1_ms: number;
  source_text?: string;
  target_text?: string;
}

export interface Language {
  code: string;
  name: string;
  voice_id?: string;
}

export interface TranslationEvent {
  type: 'partial' | 'final';
  source_text: string;
  target_text: string;
  timestamp: number;
  confidence?: number;
}

export interface LatencyMetrics {
  webrtc_connection_ms?: number;
  first_audio_ms?: number;
  translation_ms?: number;
  tts_start_ms?: number;
  total_latency_ms?: number;
}

export interface SessionConfig {
  source_lang?: string;
  target_lang: string;
  save_history: boolean;
  voice_id?: string;
  model_id?: string;
}

export type SessionMode = 'live' | 'ptt';
export type UserPlan = 'free' | 'pro';

// WebRTC specific types
export interface RTCSessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface ICECandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}

// Error types
export interface TranslatorError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIError {
  error: string;
  message: string;
  status: number;
}

// TTS related types
export interface TTSConfig {
  voiceId?: string;
  modelId?: string;
  outputFormat?: 'mp3' | 'wav' | 'pcm';
  optimize_streaming_latency?: number;
  voice_settings?: {
    stability?: number;
    similarity_boost?: number;
  };
}

export interface TTSRequest {
  text: string;
  voiceId?: string;
  modelId?: string;
  outputFormat?: string;
  optimize_streaming_latency?: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  accent?: string;
  gender?: 'male' | 'female';
  age?: 'young' | 'middle_aged' | 'old';
  description?: string;
}

export interface TTSMetrics {
  request_time_ms: number;
  first_audio_chunk_ms: number;
  total_audio_duration_ms: number;
  characters_processed: number;
}

export interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface PhraseAggregatorState {
  buffer: string;
  lastEmitTime: number;
  isProcessing: boolean;
}