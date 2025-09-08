import { LatencyMetrics } from './types';

/**
 * Latency tracking utilities for performance monitoring
 */
export class LatencyTracker {
  private startTime: number;
  private metrics: Partial<LatencyMetrics> = {};

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Mark WebRTC connection established
   */
  markWebRTCConnected(): void {
    this.metrics.webrtc_connection_ms = performance.now() - this.startTime;
  }

  /**
   * Mark first audio received
   */
  markFirstAudio(): void {
    this.metrics.first_audio_ms = performance.now() - this.startTime;
  }

  /**
   * Mark translation completed
   */
  markTranslationComplete(): void {
    this.metrics.translation_ms = performance.now() - this.startTime;
  }

  /**
   * Mark TTS started
   */
  markTTSStart(): void {
    this.metrics.tts_start_ms = performance.now() - this.startTime;
  }

  /**
   * Mark total latency (first audible output)
   */
  markTotalLatency(): void {
    this.metrics.total_latency_ms = performance.now() - this.startTime;
  }

  /**
   * Get current metrics
   */
  getMetrics(): LatencyMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset tracker for new measurement
   */
  reset(): void {
    this.startTime = performance.now();
    this.metrics = {};
  }

  /**
   * Check if latency is within acceptable threshold (<700ms)
   */
  isLatencyAcceptable(): boolean {
    return (this.metrics.total_latency_ms ?? Infinity) < 700;
  }
}

/**
 * Global latency targets (in ms)
 */
export const LATENCY_TARGETS = {
  WEBRTC_CONNECTION: 200,
  FIRST_AUDIO: 300,
  TRANSLATION: 500,
  TTS_START: 600,
  TOTAL_ACCEPTABLE: 700,
  FALLBACK_THRESHOLD: 1000,
} as const;

/**
 * Utility to measure function execution time
 */
export function measureAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  return fn().then(result => {
    const duration = performance.now() - start;
    if (label) {
      console.debug(`${label}: ${duration.toFixed(2)}ms`);
    }
    return { result, duration };
  });
}

/**
 * Network quality assessment based on RTT
 */
export function assessNetworkQuality(rttMs: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (rttMs < 50) return 'excellent';
  if (rttMs < 100) return 'good';
  if (rttMs < 250) return 'fair';
  return 'poor';
}

/**
 * Determine if we should use WebRTC or fallback to PTT based on network conditions
 */
export function shouldUseWebRTC(rttMs?: number, previousFailures = 0): boolean {
  if (previousFailures > 2) return false;
  if (!rttMs) return true; // Try WebRTC first if RTT unknown
  return rttMs < 250; // Fallback to PTT if RTT > 250ms
}