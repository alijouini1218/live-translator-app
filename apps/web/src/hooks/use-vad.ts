'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { VADProcessor, VADConfig, VADResult, DEFAULT_VAD_CONFIG } from '@live-translator/core'

interface UseVADProps {
  /** VAD configuration options */
  config?: Partial<VADConfig>
  /** Whether VAD should be active */
  enabled?: boolean
  /** Callback when speech starts */
  onSpeechStart?: (timestamp: number) => void
  /** Callback when speech ends */
  onSpeechEnd?: (timestamp: number, duration: number) => void
  /** Callback for each VAD analysis frame */
  onVADResult?: (result: VADResult) => void
  /** Callback when audio chunk is ready (contains complete speech segment) */
  onAudioChunk?: (audioData: Float32Array, timestamp: number) => void
  /** Error callback */
  onError?: (error: Error) => void
}

interface VADState {
  /** Whether VAD is currently active and processing */
  isActive: boolean
  /** Whether speech is currently being detected */
  isSpeaking: boolean
  /** Current energy level (0.0 - 1.0) */
  energy: number
  /** Current zero crossing rate */
  zcr: number
  /** Speech detection confidence (0.0 - 1.0) */
  confidence: number
  /** Duration of current speech in ms (0 if not speaking) */
  speechDuration: number
  /** Duration of current silence in ms (0 if speaking) */
  silenceDuration: number
  /** Latest VAD analysis result */
  vadResult: VADResult | null
  /** Any error that occurred */
  error: string | null
}

export function useVAD({
  config = {},
  enabled = false,
  onSpeechStart,
  onSpeechEnd,
  onVADResult,
  onAudioChunk,
  onError,
}: UseVADProps = {}) {
  const [state, setState] = useState<VADState>({
    isActive: false,
    isSpeaking: false,
    energy: 0,
    zcr: 0,
    confidence: 0,
    speechDuration: 0,
    silenceDuration: 0,
    vadResult: null,
    error: null,
  })

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const vadProcessorRef = useRef<VADProcessor | null>(null)
  const rafIdRef = useRef<number | null>(null)

  // Merge config with defaults
  const vadConfig: VADConfig = { ...DEFAULT_VAD_CONFIG, ...config }

  // Initialize VAD processor
  const initializeVAD = useCallback(() => {
    vadProcessorRef.current = new VADProcessor(vadConfig, {
      onSpeechStart: (timestamp) => {
        setState(prev => ({ ...prev, isSpeaking: true }))
        onSpeechStart?.(timestamp)
      },
      onSpeechEnd: (timestamp, duration) => {
        setState(prev => ({ ...prev, isSpeaking: false }))
        onSpeechEnd?.(timestamp, duration)
      },
      onVADResult: (result) => {
        setState(prev => ({
          ...prev,
          energy: result.energy,
          zcr: result.zcr,
          confidence: result.confidence,
          speechDuration: result.speechDuration,
          silenceDuration: result.silenceDuration,
          vadResult: result,
        }))
        onVADResult?.(result)
      },
      onAudioChunk: (audioData, timestamp) => {
        onAudioChunk?.(audioData, timestamp)
      },
    })
  }, [vadConfig, onSpeechStart, onSpeechEnd, onVADResult, onAudioChunk])

  // Set up audio processing
  const setupAudioProcessing = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: vadConfig.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false, // We want raw audio for VAD
          autoGainControl: false, // We want consistent levels for VAD
        },
      })

      mediaStreamRef.current = stream

      // Create audio context
      const audioContext = new AudioContext({
        sampleRate: vadConfig.sampleRate,
      })
      audioContextRef.current = audioContext

      // Create audio nodes
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = vadConfig.frameSize * 2
      analyser.smoothingTimeConstant = 0

      analyserRef.current = analyser
      source.connect(analyser)

      // Initialize VAD processor
      initializeVAD()

      setState(prev => ({ ...prev, isActive: true }))

      // Start processing loop
      startProcessingLoop()

    } catch (error) {
      console.error('Failed to set up audio processing:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone'
      setState(prev => ({ ...prev, error: errorMessage, isActive: false }))
      onError?.(new Error(errorMessage))
    }
  }, [vadConfig, initializeVAD, onError])

  // Start the audio processing loop
  const startProcessingLoop = useCallback(() => {
    if (!analyserRef.current || !vadProcessorRef.current) return

    const analyser = analyserRef.current
    const vadProcessor = vadProcessorRef.current
    const bufferLength = analyser.frequencyBinCount
    const audioData = new Float32Array(bufferLength)

    const processFrame = () => {
      if (!analyserRef.current || !vadProcessorRef.current) return

      // Get time domain data (raw audio samples)
      analyser.getFloatTimeDomainData(audioData)

      // Process with VAD
      const timestamp = Date.now()
      vadProcessor.processFrame(audioData, timestamp)

      // Continue processing
      rafIdRef.current = requestAnimationFrame(processFrame)
    }

    rafIdRef.current = requestAnimationFrame(processFrame)
  }, [])

  // Stop audio processing
  const stopAudioProcessing = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false, isSpeaking: false, error: null }))

    // Cancel animation frame
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Reset refs
    analyserRef.current = null
    processorRef.current = null

    // Reset VAD processor
    if (vadProcessorRef.current) {
      vadProcessorRef.current.reset()
      vadProcessorRef.current = null
    }
  }, [])

  // Start/stop VAD based on enabled prop
  useEffect(() => {
    if (enabled && !state.isActive) {
      setupAudioProcessing()
    } else if (!enabled && state.isActive) {
      stopAudioProcessing()
    }
  }, [enabled, state.isActive, setupAudioProcessing, stopAudioProcessing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioProcessing()
    }
  }, [stopAudioProcessing])

  // Update VAD config
  const updateConfig = useCallback((newConfig: Partial<VADConfig>) => {
    if (vadProcessorRef.current) {
      vadProcessorRef.current.updateConfig(newConfig)
    }
  }, [])

  // Manual start/stop controls
  const start = useCallback(() => {
    if (!state.isActive) {
      setupAudioProcessing()
    }
  }, [state.isActive, setupAudioProcessing])

  const stop = useCallback(() => {
    if (state.isActive) {
      stopAudioProcessing()
    }
  }, [state.isActive, stopAudioProcessing])

  // Reset VAD state
  const reset = useCallback(() => {
    if (vadProcessorRef.current) {
      vadProcessorRef.current.reset()
      setState(prev => ({
        ...prev,
        isSpeaking: false,
        energy: 0,
        zcr: 0,
        confidence: 0,
        speechDuration: 0,
        silenceDuration: 0,
        vadResult: null,
      }))
    }
  }, [])

  return {
    // State
    ...state,
    
    // Controls
    start,
    stop,
    reset,
    updateConfig,
    
    // Configuration
    config: vadConfig,
    
    // Utilities
    isSupported: typeof navigator !== 'undefined' && 
                 typeof navigator.mediaDevices !== 'undefined' &&
                 typeof AudioContext !== 'undefined',
  }
}