'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useVAD } from './use-vad'
import { VADConfig } from '@live-translator/core'

interface UsePTTProps {
  /** Source language code */
  sourceLanguage: string
  /** Target language code */
  targetLanguage: string
  /** PTT mode: 'hold' (hold to talk) or 'toggle' (click to toggle) */
  mode?: 'hold' | 'toggle'
  /** VAD configuration for automatic chunking */
  vadConfig?: Partial<VADConfig>
  /** Maximum recording duration in ms */
  maxRecordingDuration?: number
  /** Audio format for upload */
  audioFormat?: 'mp3' | 'webm' | 'wav'
  /** Callback when translation is received */
  onTranslation?: (sourceText: string, targetText: string, audioUrl: string) => void
  /** Callback for recording state changes */
  onRecordingStateChange?: (isRecording: boolean) => void
  /** Callback for audio level updates */
  onAudioLevel?: (level: number) => void
  /** Error callback */
  onError?: (error: Error) => void
  /** Callback for pipeline metrics */
  onMetrics?: (metrics: PTTMetrics) => void
}

interface PTTMetrics {
  sttLatency: number
  translationLatency: number
  ttsLatency: number
  totalLatency: number
  audioSize: number
  recordingDuration: number
}

interface PTTState {
  /** Whether currently recording */
  isRecording: boolean
  /** Whether currently processing (uploading/translating) */
  isProcessing: boolean
  /** Current audio level (0.0 - 1.0) */
  audioLevel: number
  /** Current recording duration in ms */
  recordingDuration: number
  /** Latest source text from STT */
  sourceText: string
  /** Latest translated text */
  targetText: string
  /** URL to latest generated audio */
  audioUrl: string | null
  /** Any error that occurred */
  error: string | null
  /** Whether PTT is supported in current browser */
  isSupported: boolean
  /** Latest processing metrics */
  metrics: PTTMetrics | null
}

export function usePTT({
  sourceLanguage,
  targetLanguage,
  mode = 'hold',
  vadConfig = {},
  maxRecordingDuration = 60000, // 60 seconds max
  audioFormat = 'webm',
  onTranslation,
  onRecordingStateChange,
  onAudioLevel,
  onError,
  onMetrics,
}: UsePTTProps) {
  const [state, setState] = useState<PTTState>({
    isRecording: false,
    isProcessing: false,
    audioLevel: 0,
    recordingDuration: 0,
    sourceText: '',
    targetText: '',
    audioUrl: null,
    error: null,
    isSupported: typeof MediaRecorder !== 'undefined' && typeof AudioContext !== 'undefined',
    metrics: null,
  })

  // Recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const maxDurationTimerRef = useRef<NodeJS.Timeout | null>(null)

  // VAD integration for intelligent chunking
  const vad = useVAD({
    config: {
      ...vadConfig,
      minSpeechDuration: 1000, // Minimum 1 second for PTT
      maxSilenceDuration: 2000, // Stop after 2 seconds of silence
    },
    enabled: state.isRecording,
    onSpeechStart: (timestamp) => {
      console.log('VAD: Speech started')
    },
    onSpeechEnd: (timestamp, duration) => {
      console.log('VAD: Speech ended, duration:', duration)
      if (mode === 'toggle' && state.isRecording) {
        // Auto-stop recording when speech ends in toggle mode
        stopRecording()
      }
    },
    onVADResult: (result) => {
      setState(prev => ({ ...prev, audioLevel: result.energy }))
      onAudioLevel?.(result.energy)
    },
    onError: (error) => {
      console.error('VAD error:', error)
      setState(prev => ({ ...prev, error: error.message }))
      onError?.(error)
    },
  })

  // Update recording duration
  useEffect(() => {
    if (state.isRecording) {
      recordingTimerRef.current = setInterval(() => {
        const duration = Date.now() - recordingStartTimeRef.current
        setState(prev => ({ ...prev, recordingDuration: duration }))
      }, 100)
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      setState(prev => ({ ...prev, recordingDuration: 0 }))
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [state.isRecording])

  // Notify about recording state changes
  useEffect(() => {
    onRecordingStateChange?.(state.isRecording)
  }, [state.isRecording, onRecordingStateChange])

  // Start recording
  const startRecording = useCallback(async () => {
    if (!state.isSupported) {
      const error = new Error('Media recording not supported in this browser')
      setState(prev => ({ ...prev, error: error.message }))
      onError?.(error)
      return
    }

    try {
      setState(prev => ({ ...prev, error: null }))

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Create MediaRecorder
      const options: MediaRecorderOptions = {}
      
      // Set format based on browser support
      if (audioFormat === 'webm' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus'
      } else if (audioFormat === 'mp3' && MediaRecorder.isTypeSupported('audio/mpeg')) {
        options.mimeType = 'audio/mpeg'
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav'
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop())
        processRecording()
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        const error = new Error('Recording failed')
        setState(prev => ({ ...prev, error: error.message, isRecording: false }))
        onError?.(error)
      }

      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      recordingStartTimeRef.current = Date.now()
      
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        sourceText: '', 
        targetText: '',
        audioUrl: null,
        metrics: null,
      }))

      // Set maximum duration timer
      maxDurationTimerRef.current = setTimeout(() => {
        if (state.isRecording) {
          stopRecording()
        }
      }, maxRecordingDuration)

    } catch (error) {
      console.error('Failed to start recording:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone'
      setState(prev => ({ ...prev, error: errorMessage }))
      onError?.(new Error(errorMessage))
    }
  }, [state.isSupported, audioFormat, maxRecordingDuration, onError])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isRecording: false }))
    }

    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
  }, [state.isRecording])

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
    }
    
    audioChunksRef.current = []
    setState(prev => ({ 
      ...prev, 
      isRecording: false, 
      isProcessing: false,
      sourceText: '',
      targetText: '',
      audioUrl: null,
      error: null,
    }))

    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current)
      maxDurationTimerRef.current = null
    }
  }, [])

  // Process recorded audio through PTT pipeline
  const processRecording = useCallback(async () => {
    if (audioChunksRef.current.length === 0) {
      setState(prev => ({ ...prev, error: 'No audio data recorded' }))
      return
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }))
    const processingStartTime = Date.now()

    try {
      // Create blob from audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      })

      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer()
      const base64Audio = btoa(String.fromCharCode(...Array.from(new Uint8Array(arrayBuffer))))

      console.log(`Sending PTT request: ${sourceLanguage} -> ${targetLanguage}, size: ${audioBlob.size} bytes`)

      // Send to PTT API
      const response = await fetch('/api/ptt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: base64Audio,
          sourceLanguage,
          targetLanguage,
          audioFormat: audioFormat,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // Extract metrics from response headers
      const sttLatency = parseInt(response.headers.get('X-STT-Latency') || '0')
      const translationLatency = parseInt(response.headers.get('X-Translation-Latency') || '0')
      const ttsLatency = parseInt(response.headers.get('X-TTS-Latency') || '0')
      const totalLatency = parseInt(response.headers.get('X-Total-Latency') || '0')
      const sourceText = response.headers.get('X-Source-Text') 
        ? atob(response.headers.get('X-Source-Text')!) 
        : ''
      const targetText = response.headers.get('X-Target-Text')
        ? atob(response.headers.get('X-Target-Text')!)
        : ''

      // Get audio response and create URL
      const audioResponse = await response.blob()
      const audioUrl = URL.createObjectURL(audioResponse)

      const recordingDuration = Date.now() - recordingStartTimeRef.current
      
      const metrics: PTTMetrics = {
        sttLatency,
        translationLatency,
        ttsLatency,
        totalLatency,
        audioSize: audioBlob.size,
        recordingDuration,
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        sourceText,
        targetText,
        audioUrl,
        metrics,
      }))

      // Notify callbacks
      onTranslation?.(sourceText, targetText, audioUrl)
      onMetrics?.(metrics)

      console.log(`PTT pipeline completed in ${totalLatency}ms`)
      console.log(`Source: "${sourceText}"`)
      console.log(`Target: "${targetText}"`)

    } catch (error) {
      console.error('PTT processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Translation failed'
      setState(prev => ({ ...prev, isProcessing: false, error: errorMessage }))
      onError?.(new Error(errorMessage))
    } finally {
      audioChunksRef.current = []
    }
  }, [sourceLanguage, targetLanguage, audioFormat, onTranslation, onMetrics, onError])

  // Toggle recording (for toggle mode)
  const toggleRecording = useCallback(() => {
    if (state.isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [state.isRecording, startRecording, stopRecording])

  // Clear previous results
  const clearResults = useCallback(() => {
    // Revoke object URL to prevent memory leaks
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl)
    }

    setState(prev => ({
      ...prev,
      sourceText: '',
      targetText: '',
      audioUrl: null,
      error: null,
      metrics: null,
    }))
  }, [state.audioUrl])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current)
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl)
      }
    }
  }, [state.audioUrl])

  return {
    // State
    ...state,
    
    // VAD state
    vadState: {
      isActive: vad.isActive,
      isSpeaking: vad.isSpeaking,
      confidence: vad.confidence,
      energy: vad.energy,
    },

    // Controls
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
    clearResults,

    // Mode-specific helpers
    isHoldMode: mode === 'hold',
    isToggleMode: mode === 'toggle',

    // Computed properties
    canRecord: state.isSupported && !state.isProcessing,
    hasResults: Boolean(state.sourceText && state.targetText),
  }
}