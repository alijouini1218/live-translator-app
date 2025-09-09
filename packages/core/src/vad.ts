/**
 * Voice Activity Detection (VAD) utilities for browser-based audio processing
 */

export interface VADConfig {
  /** Sample rate for audio processing (Hz) */
  sampleRate: number;
  /** Frame size in samples for analysis */
  frameSize: number;
  /** Energy threshold for speech detection (0.0 - 1.0) */
  energyThreshold: number;
  /** Zero crossing rate threshold for voice detection */
  zcrThreshold: number;
  /** Number of consecutive frames needed to trigger speech start */
  speechStartFrames: number;
  /** Number of consecutive frames needed to trigger speech end */
  speechEndFrames: number;
  /** Minimum speech duration in ms to be considered valid */
  minSpeechDuration: number;
  /** Maximum silence duration in ms before ending speech */
  maxSilenceDuration: number;
  /** Pre-roll duration in ms to include before speech start */
  preRollDuration: number;
  /** Post-roll duration in ms to include after speech end */
  postRollDuration: number;
}

export const DEFAULT_VAD_CONFIG: VADConfig = {
  sampleRate: 16000,
  frameSize: 512,
  energyThreshold: 0.01,
  zcrThreshold: 0.3,
  speechStartFrames: 3,
  speechEndFrames: 10,
  minSpeechDuration: 500,
  maxSilenceDuration: 800,
  preRollDuration: 200,
  postRollDuration: 300,
};

export interface VADResult {
  /** Whether speech is currently detected */
  isSpeaking: boolean;
  /** Energy level of current frame (0.0 - 1.0) */
  energy: number;
  /** Zero crossing rate of current frame */
  zcr: number;
  /** Confidence score for speech detection (0.0 - 1.0) */
  confidence: number;
  /** Time in ms since speech started (0 if not speaking) */
  speechDuration: number;
  /** Time in ms since silence started (0 if speaking) */
  silenceDuration: number;
}

export interface VADEvents {
  /** Triggered when speech starts */
  onSpeechStart: (timestamp: number) => void;
  /** Triggered when speech ends */
  onSpeechEnd: (timestamp: number, duration: number) => void;
  /** Triggered on each frame analysis */
  onVADResult: (result: VADResult) => void;
  /** Triggered when audio chunk is ready for processing */
  onAudioChunk: (audioData: Float32Array, timestamp: number) => void;
}

export class VADProcessor {
  private config: VADConfig;
  private events: Partial<VADEvents>;

  // State tracking
  private isSpeaking = false;
  private speechFrameCount = 0;
  private silenceFrameCount = 0;
  private speechStartTime = 0;
  private lastSpeechTime = 0;
  private audioBuffer: Float32Array[] = [];
  private frameCount = 0;

  // Audio analysis
  private energyHistory: number[] = [];
  private zcrHistory: number[] = [];
  private readonly HISTORY_SIZE = 10;

  constructor(
    config: Partial<VADConfig> = {},
    events: Partial<VADEvents> = {}
  ) {
    this.config = { ...DEFAULT_VAD_CONFIG, ...config };
    this.events = events;
  }

  /**
   * Process a frame of audio data
   */
  processFrame(audioData: Float32Array, timestamp: number): VADResult {
    const energy = this.calculateEnergy(audioData);
    const zcr = this.calculateZCR(audioData);

    // Update history
    this.energyHistory.push(energy);
    this.zcrHistory.push(zcr);

    if (this.energyHistory.length > this.HISTORY_SIZE) {
      this.energyHistory.shift();
      this.zcrHistory.shift();
    }

    // Calculate adaptive thresholds
    const adaptiveEnergyThreshold = this.getAdaptiveThreshold(
      this.energyHistory
    );
    const adaptiveZCRThreshold = this.config.zcrThreshold;

    // Determine if current frame contains speech
    const hasEnergy = energy > adaptiveEnergyThreshold;
    const hasVoiceCharacteristics = zcr > adaptiveZCRThreshold;
    const frameHasSpeech = hasEnergy && hasVoiceCharacteristics;

    // Update frame counters
    if (frameHasSpeech) {
      this.speechFrameCount++;
      this.silenceFrameCount = 0;
      this.lastSpeechTime = timestamp;
    } else {
      this.speechFrameCount = 0;
      this.silenceFrameCount++;
    }

    // Check for speech start
    if (
      !this.isSpeaking &&
      this.speechFrameCount >= this.config.speechStartFrames
    ) {
      this.isSpeaking = true;
      this.speechStartTime =
        timestamp - this.config.speechStartFrames * this.getFrameDuration();
      this.events.onSpeechStart?.(this.speechStartTime);

      // Start buffering audio with pre-roll
      this.audioBuffer = [];
      this.addPreRoll(timestamp);
    }

    // Check for speech end
    if (this.isSpeaking) {
      const silenceDuration = timestamp - this.lastSpeechTime;
      const speechDuration = timestamp - this.speechStartTime;

      if (
        this.silenceFrameCount >= this.config.speechEndFrames ||
        silenceDuration > this.config.maxSilenceDuration
      ) {
        // Only end speech if minimum duration is met
        if (speechDuration >= this.config.minSpeechDuration) {
          this.isSpeaking = false;
          this.events.onSpeechEnd?.(timestamp, speechDuration);

          // Emit audio chunk with post-roll
          this.addPostRoll(timestamp);
          this.emitAudioChunk(timestamp);
        }

        this.resetCounters();
      }
    }

    // Buffer audio data while speaking
    if (this.isSpeaking) {
      this.audioBuffer.push(new Float32Array(audioData));
    }

    // Calculate current durations
    const currentSpeechDuration = this.isSpeaking
      ? timestamp - this.speechStartTime
      : 0;
    const currentSilenceDuration = this.isSpeaking
      ? 0
      : timestamp - this.lastSpeechTime;

    // Calculate confidence score
    const confidence = this.calculateConfidence(
      energy,
      zcr,
      adaptiveEnergyThreshold,
      adaptiveZCRThreshold
    );

    const result: VADResult = {
      isSpeaking: this.isSpeaking,
      energy,
      zcr,
      confidence,
      speechDuration: currentSpeechDuration,
      silenceDuration: currentSilenceDuration,
    };

    this.events.onVADResult?.(result);
    this.frameCount++;

    return result;
  }

  /**
   * Calculate energy (RMS) of audio frame
   */
  private calculateEnergy(audioData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i];
    }
    return Math.sqrt(sum / audioData.length);
  }

  /**
   * Calculate Zero Crossing Rate
   */
  private calculateZCR(audioData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if (audioData[i] >= 0 !== audioData[i - 1] >= 0) {
        crossings++;
      }
    }
    return crossings / (audioData.length - 1);
  }

  /**
   * Get adaptive threshold based on recent energy history
   */
  private getAdaptiveThreshold(history: number[]): number {
    if (history.length === 0) return this.config.energyThreshold;

    const mean = history.reduce((sum, val) => sum + val, 0) / history.length;
    const variance =
      history.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      history.length;
    const stdDev = Math.sqrt(variance);

    // Adaptive threshold is mean + 2 standard deviations, but not less than config threshold
    return Math.max(this.config.energyThreshold, mean + 2 * stdDev);
  }

  /**
   * Calculate confidence score for speech detection
   */
  private calculateConfidence(
    energy: number,
    zcr: number,
    energyThreshold: number,
    zcrThreshold: number
  ): number {
    const energyScore = Math.min(1, energy / energyThreshold);
    const zcrScore = Math.min(1, zcr / zcrThreshold);
    return (energyScore + zcrScore) / 2;
  }

  /**
   * Get duration of one frame in milliseconds
   */
  private getFrameDuration(): number {
    return (this.config.frameSize / this.config.sampleRate) * 1000;
  }

  /**
   * Add pre-roll audio to buffer
   */
  private addPreRoll(currentTime: number): void {
    // This would typically require keeping a circular buffer of recent audio
    // For now, we'll implement a simplified version
    // In a real implementation, you'd maintain a rolling buffer
  }

  /**
   * Add post-roll audio to buffer
   */
  private addPostRoll(currentTime: number): void {
    // Similar to pre-roll, this would add additional audio after speech ends
  }

  /**
   * Emit the accumulated audio chunk
   */
  private emitAudioChunk(timestamp: number): void {
    if (this.audioBuffer.length === 0) return;

    // Concatenate all buffered audio frames
    const totalSamples = this.audioBuffer.reduce(
      (sum, frame) => sum + frame.length,
      0
    );
    const combinedAudio = new Float32Array(totalSamples);

    let offset = 0;
    for (const frame of this.audioBuffer) {
      combinedAudio.set(frame, offset);
      offset += frame.length;
    }

    this.events.onAudioChunk?.(combinedAudio, timestamp);
    this.audioBuffer = [];
  }

  /**
   * Reset internal counters
   */
  private resetCounters(): void {
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
  }

  /**
   * Reset the entire VAD state
   */
  reset(): void {
    this.isSpeaking = false;
    this.speechFrameCount = 0;
    this.silenceFrameCount = 0;
    this.speechStartTime = 0;
    this.lastSpeechTime = 0;
    this.audioBuffer = [];
    this.frameCount = 0;
    this.energyHistory = [];
    this.zcrHistory = [];
  }

  /**
   * Update VAD configuration
   */
  updateConfig(newConfig: Partial<VADConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): VADConfig {
    return { ...this.config };
  }

  /**
   * Get current state
   */
  getState() {
    return {
      isSpeaking: this.isSpeaking,
      speechFrameCount: this.speechFrameCount,
      silenceFrameCount: this.silenceFrameCount,
      speechStartTime: this.speechStartTime,
      lastSpeechTime: this.lastSpeechTime,
      frameCount: this.frameCount,
    };
  }
}

/**
 * Utility functions for audio processing
 */
export const VADUtils = {
  /**
   * Convert audio data to the specified sample rate
   */
  resampleAudio(
    audioData: Float32Array,
    fromSampleRate: number,
    toSampleRate: number
  ): Float32Array {
    if (fromSampleRate === toSampleRate) {
      return audioData;
    }

    const ratio = fromSampleRate / toSampleRate;
    const newLength = Math.round(audioData.length / ratio);
    const resampled = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexFloor = Math.floor(srcIndex);
      const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
      const fraction = srcIndex - srcIndexFloor;

      resampled[i] =
        audioData[srcIndexFloor] * (1 - fraction) +
        audioData[srcIndexCeil] * fraction;
    }

    return resampled;
  },

  /**
   * Apply simple noise gate to audio data
   */
  applyNoiseGate(audioData: Float32Array, threshold: number): Float32Array {
    const gated = new Float32Array(audioData.length);
    for (let i = 0; i < audioData.length; i++) {
      gated[i] = Math.abs(audioData[i]) > threshold ? audioData[i] : 0;
    }
    return gated;
  },

  /**
   * Normalize audio data to prevent clipping
   */
  normalizeAudio(audioData: Float32Array): Float32Array {
    let max = 0;
    for (let i = 0; i < audioData.length; i++) {
      max = Math.max(max, Math.abs(audioData[i]));
    }

    if (max === 0) return audioData;

    const normalized = new Float32Array(audioData.length);
    const scale = 0.95 / max; // Leave some headroom

    for (let i = 0; i < audioData.length; i++) {
      normalized[i] = audioData[i] * scale;
    }

    return normalized;
  },
};
