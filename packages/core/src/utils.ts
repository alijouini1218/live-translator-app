/**
 * Utility functions for the Live Translator core package
 */

/**
 * Phrase aggregator for TTS optimization
 * Reduces noisy partial translations by waiting for sentence boundaries
 */
export class PhraseAggregator {
  private buffer = '';
  private lastEmit = 0;
  private readonly SENTENCE_ENDINGS = /[.!?…]$/;
  private readonly MAX_WAIT_MS = 900;

  /**
   * Process partial transcript and emit complete phrases
   */
  processPartial(
    partialText: string,
    onPhraseComplete: (phrase: string) => void
  ): void {
    this.buffer += partialText;
    const now = performance.now();
    
    const shouldEmit = 
      this.SENTENCE_ENDINGS.test(this.buffer.trim()) || 
      now - this.lastEmit > this.MAX_WAIT_MS;
    
    if (shouldEmit) {
      const phrase = this.buffer.trim();
      this.buffer = '';
      this.lastEmit = now;
      
      if (phrase) {
        onPhraseComplete(phrase);
      }
    }
  }

  /**
   * Force emit current buffer (e.g., on session end)
   */
  flush(onPhraseComplete: (phrase: string) => void): void {
    const phrase = this.buffer.trim();
    if (phrase) {
      onPhraseComplete(phrase);
    }
    this.buffer = '';
    this.lastEmit = performance.now();
  }

  /**
   * Clear the buffer
   */
  clear(): void {
    this.buffer = '';
    this.lastEmit = performance.now();
  }
}

/**
 * Audio processing utilities
 */
export class AudioUtils {
  /**
   * Convert Float32Array to Int16Array (PCM16)
   */
  static float32ToInt16(buffer: Float32Array): Int16Array {
    const length = buffer.length;
    const result = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = sample * 32767;
    }
    return result;
  }

  /**
   * Convert Int16Array to Float32Array
   */
  static int16ToFloat32(buffer: Int16Array): Float32Array {
    const length = buffer.length;
    const result = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      result[i] = buffer[i] / 32767;
    }
    return result;
  }

  /**
   * Calculate RMS (Root Mean Square) for audio level detection
   */
  static calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Apply fade in/out to prevent audio pops
   */
  static applyFade(
    buffer: Float32Array,
    fadeInSamples = 0,
    fadeOutSamples = 0
  ): Float32Array {
    const result = new Float32Array(buffer);
    
    // Fade in
    for (let i = 0; i < fadeInSamples && i < buffer.length; i++) {
      result[i] *= i / fadeInSamples;
    }
    
    // Fade out
    const start = buffer.length - fadeOutSamples;
    for (let i = start; i < buffer.length; i++) {
      result[i] *= (buffer.length - i) / fadeOutSamples;
    }
    
    return result;
  }
}

/**
 * WebRTC connection utilities
 */
export class WebRTCUtils {
  /**
   * Create optimized RTCConfiguration for low latency
   */
  static createRTCConfiguration(): RTCConfiguration {
    return {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10,
    };
  }

  /**
   * Create audio-only media constraints for optimal quality
   */
  static createAudioConstraints(): MediaStreamConstraints {
    return {
      audio: {
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    };
  }
}

/**
 * Error handling utilities
 */
export class ErrorHandler {
  /**
   * Categorize and handle WebRTC errors
   */
  static handleWebRTCError(error: Error): {
    category: 'permission' | 'network' | 'hardware' | 'unknown';
    shouldFallback: boolean;
    userMessage: string;
  } {
    const message = error.message.toLowerCase();
    
    if (message.includes('permission') || message.includes('denied')) {
      return {
        category: 'permission',
        shouldFallback: false,
        userMessage: 'Please allow microphone access to use live translation.',
      };
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return {
        category: 'network',
        shouldFallback: true,
        userMessage: 'Network issues detected. Switching to push-to-talk mode.',
      };
    }
    
    if (message.includes('device') || message.includes('hardware')) {
      return {
        category: 'hardware',
        shouldFallback: true,
        userMessage: 'Audio device issues. Switching to push-to-talk mode.',
      };
    }
    
    return {
      category: 'unknown',
      shouldFallback: true,
      userMessage: 'Connection failed. Switching to push-to-talk mode.',
    };
  }
}

/**
 * Session management utilities
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function estimateCost(characters: number, plan: 'free' | 'pro'): number {
  // Cost estimation in cents
  if (plan === 'free') return 0; // Free tier
  
  // Pro tier: roughly $0.001 per character (example pricing)
  return Math.ceil(characters * 0.1); // 0.1 cents per character
}