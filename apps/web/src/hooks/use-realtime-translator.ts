'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { LatencyTracker, PhraseAggregator } from '@live-translator/core'

interface UseRealtimeTranslatorProps {
  sourceLanguage: string
  targetLanguage: string
  onError?: (error: Error) => void
  onLatencyUpdate?: (metrics: any) => void
}

interface TranslationState {
  isConnected: boolean
  isListening: boolean
  sourceText: string
  targetText: string
  audioLevel: number
  connectionError: string | null
}

export function useRealtimeTranslator({
  sourceLanguage,
  targetLanguage,
  onError,
  onLatencyUpdate,
}: UseRealtimeTranslatorProps) {
  const [state, setState] = useState<TranslationState>({
    isConnected: false,
    isListening: false,
    sourceText: '',
    targetText: '',
    audioLevel: 0,
    connectionError: null,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const latencyTracker = useRef(new LatencyTracker())
  const phraseAggregator = useRef(new PhraseAggregator())

  // Cleanup function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isListening: false,
      audioLevel: 0,
    }))
  }, [])

  // Start connection
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, connectionError: null }))
      latencyTracker.current.reset()

      // Get ephemeral session from server
      const response = await fetch(
        `/api/ephemeral-session?source_lang=${sourceLanguage}&target_lang=${targetLanguage}`
      )

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const sessionData = await response.json()
      
      // For now, we'll simulate the WebSocket connection since OpenAI Realtime API
      // requires server-side handling. This is a placeholder for M3 completion.
      // In production, you'd need to create a WebSocket proxy on your server.
      console.log('Session data:', sessionData)
      
      // Simulate WebSocket connection
      const ws = {
        readyState: 1, // WebSocket.OPEN
        send: (data: string) => {
          console.log('WebSocket send:', JSON.parse(data))
        },
        close: () => {},
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      } as any
      wsRef.current = ws

      // Simulate connection established
      setTimeout(() => {
        console.log('Simulated WebSocket connected')
        latencyTracker.current.markWebRTCConnected()
        setState(prev => ({ ...prev, isConnected: true }))
        
        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a simultaneous interpreter. Translate from ${sourceLanguage} to ${targetLanguage}.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            temperature: 0.3,
          },
        }))

        // Simulate translation demo after connection
        setTimeout(() => {
          setState(prev => ({ ...prev, isListening: true }))
          setTimeout(() => {
            setState(prev => ({ 
              ...prev, 
              sourceText: 'Hello, how are you today?',
              isListening: false 
            }))
            setTimeout(() => {
              setState(prev => ({ 
                ...prev, 
                targetText: 'Hola, ¿cómo estás hoy?'
              }))
              latencyTracker.current.markTotalLatency()
              if (onLatencyUpdate) {
                onLatencyUpdate(latencyTracker.current.getMetrics())
              }
            }, 800)
          }, 2000)
        }, 3000)
      }, 1000)

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'input_audio_buffer.speech_started':
            setState(prev => ({ ...prev, isListening: true }))
            break
            
          case 'input_audio_buffer.speech_stopped':
            setState(prev => ({ ...prev, isListening: false }))
            break
            
          case 'conversation.item.input_audio_transcription.completed':
            latencyTracker.current.markFirstAudio()
            setState(prev => ({ 
              ...prev, 
              sourceText: data.transcript 
            }))
            break
            
          case 'response.audio.delta':
            // Handle streaming audio output
            latencyTracker.current.markTTSStart()
            break
            
          case 'response.text.delta':
            // Handle partial translation text
            phraseAggregator.current.processPartial(
              data.delta, 
              (completePhrase) => {
                setState(prev => ({ 
                  ...prev, 
                  targetText: prev.targetText + ' ' + completePhrase 
                }))
              }
            )
            break
            
          case 'response.done':
            latencyTracker.current.markTotalLatency()
            if (onLatencyUpdate) {
              onLatencyUpdate(latencyTracker.current.getMetrics())
            }
            break
            
          case 'error':
            console.error('WebSocket error:', data.error)
            setState(prev => ({ 
              ...prev, 
              connectionError: data.error.message || 'Unknown error' 
            }))
            break
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setState(prev => ({ 
          ...prev, 
          connectionError: 'Connection error' 
        }))
        if (onError) {
          onError(new Error('WebSocket connection failed'))
        }
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          isListening: false 
        }))
      }

      // Set up audio capture
      await setupAudioCapture(ws)

    } catch (error) {
      console.error('Connection error:', error)
      setState(prev => ({ 
        ...prev, 
        connectionError: error instanceof Error ? error.message : 'Unknown error' 
      }))
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'))
      }
    }
  }, [sourceLanguage, targetLanguage, onError, onLatencyUpdate])

  // Set up audio capture
  const setupAudioCapture = useCallback(async (ws: WebSocket) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      mediaStreamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        
        // Calculate audio level for visualization
        const rms = Math.sqrt(inputData.reduce((sum, sample) => sum + sample * sample, 0) / inputData.length)
        setState(prev => ({ ...prev, audioLevel: Math.min(1, rms * 10) }))

        // Convert to PCM16 and send to WebSocket
        if (ws.readyState === WebSocket.OPEN) {
          const pcm16 = new Int16Array(inputData.length)
          for (let i = 0; i < inputData.length; i++) {
            pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
          }

          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: Array.from(pcm16).map(n => n.toString()).join(','),
          }))
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

    } catch (error) {
      console.error('Audio setup error:', error)
      throw new Error('Failed to access microphone')
    }
  }, [])

  // Disconnect
  const disconnect = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Clear translation
  const clearTranslation = useCallback(() => {
    setState(prev => ({
      ...prev,
      sourceText: '',
      targetText: '',
    }))
    phraseAggregator.current.clear()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [cleanup])

  return {
    ...state,
    connect,
    disconnect,
    clearTranslation,
  }
}