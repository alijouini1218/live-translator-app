import { PhraseAggregatorState } from './types';

/**
 * Phrase aggregation system for TTS
 * Buffers partial transcript until phrase-final markers or timeout
 * Avoids speaking too many small fragments
 */

// Phrase-ending punctuation patterns
const PHRASE_ENDINGS = /[.!?…。！？]+$/;
const SENTENCE_BOUNDARY_CHARS = '.!?…。！？';

// Timeout for forced emission (in milliseconds)
const PHRASE_TIMEOUT_MS = 900;

// Minimum phrase length to consider for emission
const MIN_PHRASE_LENGTH = 10;

export class PhraseAggregator {
  private state: PhraseAggregatorState = {
    buffer: '',
    lastEmitTime: 0,
    isProcessing: false,
  };

  private onEmit: (text: string) => void;
  private timeoutId?: NodeJS.Timeout;

  constructor(onEmit: (text: string) => void) {
    this.onEmit = onEmit;
  }

  /**
   * Add partial text to the buffer and emit if conditions are met
   */
  addPartial(partialText: string): void {
    if (this.state.isProcessing || !partialText.trim()) {
      return;
    }

    // Clean and normalize the input
    const cleanText = partialText.trim();
    
    // Update buffer with new content
    // Handle both incremental and replacement scenarios
    if (this.state.buffer && cleanText.startsWith(this.state.buffer)) {
      // Incremental update (common case)
      this.state.buffer = cleanText;
    } else if (cleanText.length > this.state.buffer.length) {
      // Replacement with longer text
      this.state.buffer = cleanText;
    } else {
      // Fallback: append new unique content
      const newContent = cleanText.replace(this.state.buffer, '').trim();
      if (newContent) {
        this.state.buffer += (this.state.buffer ? ' ' : '') + newContent;
      }
    }

    // Clear any existing timeout
    this.clearTimeout();

    // Check emission conditions
    this.checkForEmission();
  }

  /**
   * Force emit whatever is in the buffer
   */
  forceEmit(): void {
    if (this.state.buffer.trim()) {
      this.emitPhrase(this.state.buffer.trim());
    }
  }

  /**
   * Clear the buffer without emitting
   */
  clear(): void {
    this.state.buffer = '';
    this.state.lastEmitTime = 0;
    this.state.isProcessing = false;
    this.clearTimeout();
  }

  /**
   * Get current buffer content
   */
  getBuffer(): string {
    return this.state.buffer;
  }

  /**
   * Check if we should emit based on various conditions
   */
  private checkForEmission(): void {
    const now = performance.now();
    const timeSinceLastEmit = now - this.state.lastEmitTime;
    const buffer = this.state.buffer.trim();

    if (!buffer) {
      return;
    }

    // Condition 1: Phrase ends with punctuation
    if (this.hasPhraseEnding(buffer)) {
      console.log('Emitting due to phrase ending:', buffer.slice(-10));
      this.emitPhrase(buffer);
      return;
    }

    // Condition 2: Buffer is long enough and has some pause indicators
    if (buffer.length > MIN_PHRASE_LENGTH && this.hasNaturalPause(buffer)) {
      console.log('Emitting due to natural pause:', buffer.slice(-20));
      this.emitPhrase(buffer);
      return;
    }

    // Condition 3: Set timeout for forced emission
    if (timeSinceLastEmit > PHRASE_TIMEOUT_MS / 2) {
      this.timeoutId = setTimeout(() => {
        if (this.state.buffer.trim() && !this.state.isProcessing) {
          console.log('Emitting due to timeout:', this.state.buffer.slice(0, 30));
          this.emitPhrase(this.state.buffer.trim());
        }
      }, PHRASE_TIMEOUT_MS / 2);
    }
  }

  /**
   * Check if buffer ends with phrase-final punctuation
   */
  private hasPhraseEnding(text: string): boolean {
    return PHRASE_ENDINGS.test(text);
  }

  /**
   * Check for natural pause indicators in the text
   */
  private hasNaturalPause(text: string): boolean {
    // Look for commas, semicolons, colons, or conjunctions
    const pauseIndicators = /[,;:]|\b(and|but|or|so|then|however|meanwhile|therefore)\b/i;
    return pauseIndicators.test(text);
  }

  /**
   * Emit the phrase and reset buffer
   */
  private emitPhrase(text: string): void {
    if (!text || this.state.isProcessing) {
      return;
    }

    this.state.isProcessing = true;
    this.state.lastEmitTime = performance.now();
    
    // Clear buffer and timeout
    this.state.buffer = '';
    this.clearTimeout();

    try {
      // Emit the phrase
      this.onEmit(text);
    } catch (error) {
      console.error('Error emitting phrase:', error);
    } finally {
      // Reset processing state after a short delay to avoid rapid re-emission
      setTimeout(() => {
        this.state.isProcessing = false;
      }, 100);
    }
  }

  /**
   * Clear any pending timeout
   */
  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.clearTimeout();
    this.clear();
  }
}

/**
 * Simple functional interface for phrase aggregation
 * Legacy support for the pattern shown in the instructions
 */
let globalBuffer = '';
let globalLastEmit = 0;

export function onPartialTranscript(part: string, speak: (text: string) => void): void {
  globalBuffer += part;
  const now = performance.now();
  const emit = PHRASE_ENDINGS.test(globalBuffer.trim()) || now - globalLastEmit > PHRASE_TIMEOUT_MS;
  
  if (emit) {
    const text = globalBuffer.trim();
    globalBuffer = '';
    globalLastEmit = now;
    if (text) {
      speak(text);
    }
  }
}

/**
 * Reset global phrase aggregator state
 */
export function resetPhraseAggregator(): void {
  globalBuffer = '';
  globalLastEmit = 0;
}

/**
 * Create a new phrase aggregator instance
 */
export function createPhraseAggregator(onEmit: (text: string) => void): PhraseAggregator {
  return new PhraseAggregator(onEmit);
}