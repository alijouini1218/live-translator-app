'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioState, TTSConfig, TTSMetrics } from '@live-translator/core/types';
import { getBestVoiceForLanguage } from '@live-translator/core/languages';

interface UseTTSOptions {
  languageCode: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
  onMetrics?: (metrics: TTSMetrics) => void;
  enableDucking?: boolean;
  duckingVolume?: number; // Volume level when ducking (0.0-1.0)
  fadeTime?: number; // Fade transition time in ms
}

interface UseTTSReturn {
  audioState: AudioState;
  speak: (text: string, config?: TTSConfig) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  setVolume: (volume: number) => void;
  duck: () => void; // Fade out for barge-in
  unduck: () => void; // Fade back to normal volume
  clearQueue: () => void;
}

interface TTSQueueItem {
  text: string;
  config?: TTSConfig;
  id: string;
}

export function useTTS({
  languageCode,
  onPlayStart,
  onPlayEnd,
  onError,
  onMetrics,
  enableDucking = true,
  duckingVolume = 0.1,
  fadeTime = 300,
}: UseTTSOptions): UseTTSReturn {
  // Audio state
  const [audioState, setAudioState] = useState<AudioState>({
    isPlaying: false,
    isPaused: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 1.0,
  });

  // Refs for audio management
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  // TTS queue management
  const queueRef = useRef<TTSQueueItem[]>([]);
  const currentItemRef = useRef<TTSQueueItem | null>(null);
  const isProcessingRef = useRef(false);
  
  // Ducking state
  const [isDucked, setIsDucked] = useState(false);
  const originalVolumeRef = useRef(1.0);

  // Initialize audio context and nodes
  const initializeAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.crossOrigin = 'anonymous';
      }

      if (!gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      }

      if (!sourceNodeRef.current && audioRef.current && audioContextRef.current && gainNodeRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(gainNodeRef.current);
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      return false;
    }
  }, []);

  // Update audio state
  const updateAudioState = useCallback((updates: Partial<AudioState>) => {
    setAudioState(prev => ({ ...prev, ...updates }));
  }, []);

  // Fade volume for ducking/barge-in
  const fadeVolume = useCallback((targetVolume: number, duration: number = fadeTime) => {
    if (!gainNodeRef.current || !audioContextRef.current) return;

    const currentTime = audioContextRef.current.currentTime;
    gainNodeRef.current.gain.cancelScheduledValues(currentTime);
    gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
    gainNodeRef.current.gain.linearRampToValueAtTime(targetVolume, currentTime + duration / 1000);
  }, [fadeTime]);

  // Duck audio (fade out for barge-in)
  const duck = useCallback(() => {
    if (!enableDucking || isDucked) return;
    
    console.log('Ducking audio for barge-in');
    originalVolumeRef.current = audioState.volume;
    fadeVolume(duckingVolume);
    setIsDucked(true);
  }, [enableDucking, isDucked, audioState.volume, duckingVolume, fadeVolume]);

  // Unduck audio (fade back to normal)
  const unduck = useCallback(() => {
    if (!enableDucking || !isDucked) return;
    
    console.log('Unducking audio');
    fadeVolume(originalVolumeRef.current);
    setIsDucked(false);
  }, [enableDucking, isDucked, fadeVolume]);

  // Process TTS queue
  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    const item = queueRef.current.shift()!;
    currentItemRef.current = item;

    try {
      updateAudioState({ isLoading: true });

      const startTime = performance.now();
      
      // Get voice ID for the language
      const voiceId = getBestVoiceForLanguage(languageCode);
      
      // Prepare TTS request
      const ttsConfig = {
        voiceId,
        modelId: 'eleven_turbo_v2_5',
        outputFormat: 'mp3',
        optimize_streaming_latency: 2,
        ...item.config,
      };

      // Call TTS API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: item.text,
          ...ttsConfig,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const firstAudioTime = performance.now();

      if (!audioRef.current) {
        throw new Error('Audio element not initialized');
      }

      // Set up audio element
      audioRef.current.src = audioUrl;
      
      // Set up event listeners
      const handleCanPlay = () => {
        updateAudioState({ 
          isLoading: false, 
          duration: audioRef.current?.duration || 0 
        });
      };

      const handlePlay = () => {
        updateAudioState({ isPlaying: true, isPaused: false });
        onPlayStart?.();
      };

      const handlePause = () => {
        updateAudioState({ isPlaying: false, isPaused: true });
      };

      const handleEnded = () => {
        updateAudioState({ 
          isPlaying: false, 
          isPaused: false, 
          currentTime: 0 
        });
        
        URL.revokeObjectURL(audioUrl);
        onPlayEnd?.();
        
        // Report metrics
        const totalTime = performance.now();
        const metrics: TTSMetrics = {
          request_time_ms: firstAudioTime - startTime,
          first_audio_chunk_ms: firstAudioTime - startTime,
          total_audio_duration_ms: totalTime - startTime,
          characters_processed: item.text.length,
        };
        onMetrics?.(metrics);
        
        // Process next item in queue
        currentItemRef.current = null;
        isProcessingRef.current = false;
        processQueue();
      };

      const handleTimeUpdate = () => {
        updateAudioState({ currentTime: audioRef.current?.currentTime || 0 });
      };

      const handleError = (e: Event) => {
        const error = new Error('Audio playback error');
        console.error('TTS playback error:', e);
        updateAudioState({ 
          isPlaying: false, 
          isPaused: false, 
          isLoading: false 
        });
        onError?.(error);
        
        URL.revokeObjectURL(audioUrl);
        currentItemRef.current = null;
        isProcessingRef.current = false;
      };

      // Attach event listeners
      audioRef.current.addEventListener('canplay', handleCanPlay);
      audioRef.current.addEventListener('play', handlePlay);
      audioRef.current.addEventListener('pause', handlePause);
      audioRef.current.addEventListener('ended', handleEnded);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.addEventListener('error', handleError);

      // Play audio
      await audioRef.current.play();

      // Clean up event listeners on component unmount
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('canplay', handleCanPlay);
          audioRef.current.removeEventListener('play', handlePlay);
          audioRef.current.removeEventListener('pause', handlePause);
          audioRef.current.removeEventListener('ended', handleEnded);
          audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
          audioRef.current.removeEventListener('error', handleError);
        }
      };

    } catch (error) {
      console.error('TTS processing error:', error);
      updateAudioState({ isLoading: false, isPlaying: false });
      onError?.(error as Error);
      
      currentItemRef.current = null;
      isProcessingRef.current = false;
      
      // Continue with next item
      processQueue();
    }
  }, [languageCode, onPlayStart, onPlayEnd, onError, onMetrics, updateAudioState]);

  // Speak function - adds text to queue
  const speak = useCallback(async (text: string, config?: TTSConfig) => {
    if (!text.trim()) return;
    
    // Initialize audio context if needed
    if (!initializeAudioContext()) {
      onError?.(new Error('Failed to initialize audio system'));
      return;
    }
    
    // Add to queue
    const item: TTSQueueItem = {
      text: text.trim(),
      config,
      id: Math.random().toString(36).substr(2, 9),
    };
    
    queueRef.current.push(item);
    console.log('Added to TTS queue:', { text: text.slice(0, 50), queueLength: queueRef.current.length });
    
    // Start processing if not already processing
    if (!isProcessingRef.current) {
      processQueue();
    }
  }, [initializeAudioContext, onError, processQueue]);

  // Stop playback and clear queue
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    queueRef.current = [];
    currentItemRef.current = null;
    isProcessingRef.current = false;
    updateAudioState({ 
      isPlaying: false, 
      isPaused: false, 
      currentTime: 0,
      isLoading: false,
    });
  }, [updateAudioState]);

  // Pause playback
  const pause = useCallback(() => {
    if (audioRef.current && audioState.isPlaying) {
      audioRef.current.pause();
    }
  }, [audioState.isPlaying]);

  // Resume playback
  const resume = useCallback(() => {
    if (audioRef.current && audioState.isPaused) {
      audioRef.current.play().catch(error => {
        console.error('Resume error:', error);
        onError?.(error);
      });
    }
  }, [audioState.isPaused, onError]);

  // Set volume
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    
    if (gainNodeRef.current && !isDucked) {
      gainNodeRef.current.gain.value = clampedVolume;
    }
    
    updateAudioState({ volume: clampedVolume });
    
    if (!isDucked) {
      originalVolumeRef.current = clampedVolume;
    }
  }, [isDucked, updateAudioState]);

  // Clear queue without stopping current playback
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    console.log('TTS queue cleared');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [stop]);

  return {
    audioState,
    speak,
    stop,
    pause,
    resume,
    setVolume,
    duck,
    unduck,
    clearQueue,
  };
}