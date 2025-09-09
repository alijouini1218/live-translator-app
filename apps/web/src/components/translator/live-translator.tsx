'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, AudioControls, PTTControls, HistoryToggle } from '@live-translator/ui'
import { LanguageSelector } from './language-selector'
import { TranslationDisplay } from './translation-display'
import { AudioVisualizer } from './audio-visualizer'
import { useRealtimeTranslator } from '@/hooks/use-realtime-translator'
import { useTTS } from '@/hooks/use-tts'
import { usePTT } from '@/hooks/use-ptt'
import { useSessionManager } from '@/hooks/use-session-history'
import { createPhraseAggregator } from '@live-translator/core'

interface LiveTranslatorProps {
  className?: string
}

type TranslationMode = 'realtime' | 'ptt'

interface ConnectionMetrics {
  rtt: number
  quality: 'excellent' | 'good' | 'poor'
  lastUpdate: number
}

export function LiveTranslator({ className = '' }: LiveTranslatorProps) {
  const [sourceLanguage, setSourceLanguage] = useState('auto')
  const [targetLanguage, setTargetLanguage] = useState('es')
  const [latencyMetrics, setLatencyMetrics] = useState<any>(null)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [lastProcessedText, setLastProcessedText] = useState('')
  const [mode, setMode] = useState<TranslationMode>('realtime')
  const [pttMode, setPttMode] = useState<'hold' | 'toggle'>('hold')
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics | null>(null)
  const [autoSwitchEnabled, setAutoSwitchEnabled] = useState(true)
  const [modeSwitch, setModeSwitch] = useState<{ reason: string; timestamp: number } | null>(null)
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null)

  // Session management for history
  const {
    currentSession,
    historyEnabled,
    setHistoryEnabled,
    startSession,
    endSession,
    addTranscript
  } = useSessionManager()

  const {
    isConnected,
    isListening,
    sourceText,
    targetText,
    audioLevel,
    connectionError,
    connect,
    disconnect,
    clearTranslation,
  } = useRealtimeTranslator({
    sourceLanguage,
    targetLanguage,
    onError: (error) => {
      console.error('Realtime translation error:', error)
      
      // Auto-switch to PTT on connection errors if auto-switch enabled
      if (autoSwitchEnabled && mode === 'realtime') {
        console.log('Auto-switching to PTT mode due to connection error:', error.message)
        setMode('ptt')
        setModeSwitch({ 
          reason: `Connection error: ${error.message}. Switched to Push-to-Talk as fallback.`,
          timestamp: Date.now()
        })
      }
    },
    onLatencyUpdate: (metrics) => {
      setLatencyMetrics(metrics)
      
      // Calculate connection quality and check for auto-switching
      if (metrics.total_latency_ms) {
        const rtt = metrics.webrtc_connection_ms || metrics.total_latency_ms
        const quality: 'excellent' | 'good' | 'poor' = rtt < 150 ? 'excellent' : rtt < 250 ? 'good' : 'poor'
        
        const newConnectionMetrics = {
          rtt,
          quality,
          lastUpdate: Date.now()
        }
        setConnectionMetrics(newConnectionMetrics)
        
        // Auto-switch to PTT if RTT > 250ms and auto-switch enabled
        if (autoSwitchEnabled && mode === 'realtime' && rtt > 250) {
          console.log('Auto-switching to PTT mode due to high RTT:', rtt)
          setMode('ptt')
          setModeSwitch({ 
            reason: `High latency detected (${rtt}ms). Switched to Push-to-Talk for better performance.`,
            timestamp: Date.now()
          })
          // Disconnect realtime when switching
          if (isConnected) {
            disconnect()
          }
        }
      }
      
      console.log('Latency metrics:', metrics)
    },
  })

  // Initialize TTS
  const {
    audioState,
    speak,
    stop: stopTTS,
    pause: pauseTTS,
    resume: resumeTTS,
    setVolume,
    duck,
    unduck,
    clearQueue,
  } = useTTS({
    languageCode: targetLanguage,
    onPlayStart: () => {
      console.log('TTS playback started')
    },
    onPlayEnd: () => {
      console.log('TTS playback ended')
    },
    onError: (error) => {
      console.error('TTS error:', error)
    },
    onMetrics: (metrics) => {
      console.log('TTS metrics:', metrics)
    },
    enableDucking: true,
    duckingVolume: 0.1,
    fadeTime: 300,
  })

  // PTT integration
  const ptt = usePTT({
    sourceLanguage,
    targetLanguage,
    mode: pttMode,
    onTranslation: async (sourceText, targetText, audioUrl) => {
      console.log('PTT Translation received:', { sourceText, targetText })
      
      // Play TTS if enabled
      if (ttsEnabled && targetText.trim()) {
        speak(targetText)
      }
      
      // Save transcript if history enabled (for PTT, create session per request)
      if (historyEnabled && sourceText && targetText) {
        let session = currentSession
        
        // Start new session if none exists
        if (!session) {
          session = await startSession(sourceLanguage, targetLanguage, 'ptt')
          setSessionStartTime(Date.now())
        }
        
        if (session) {
          // For PTT, record the exact timing of this translation
          const now = Date.now()
          const t0Ms = sessionStartTime ? now - sessionStartTime : 0
          const t1Ms = t0Ms + 100 // Very short duration for PTT
          
          await addTranscript(t0Ms, t1Ms, sourceText, targetText)
        }
      }
    },
    onError: (error) => {
      console.error('PTT error:', error)
      alert(`PTT error: ${error.message}`)
    },
    onMetrics: (metrics) => {
      console.log('PTT metrics:', metrics)
    },
  })

  // Create phrase aggregator for smart TTS chunking
  const phraseAggregator = createPhraseAggregator(useCallback((phrase: string) => {
    if (ttsEnabled && phrase.trim()) {
      console.log('Speaking phrase:', phrase)
      speak(phrase)
    }
  }, [ttsEnabled, speak]))

  // Handle barge-in (duck audio when user starts speaking)
  useEffect(() => {
    const isUserSpeaking = mode === 'realtime' ? isListening : ptt.vadState.isSpeaking
    
    if (isUserSpeaking && audioState.isPlaying) {
      console.log('User speaking detected, ducking TTS audio')
      duck()
    } else if (!isUserSpeaking && audioState.isPlaying) {
      console.log('User stopped speaking, unducking TTS audio')
      unduck()
    }
  }, [isListening, ptt.vadState.isSpeaking, audioState.isPlaying, duck, unduck, mode])

  // Process translated text through phrase aggregator (realtime mode)
  useEffect(() => {
    if (mode === 'realtime' && targetText && targetText !== lastProcessedText) {
      const newText = targetText.slice(lastProcessedText.length)
      if (newText.trim()) {
        console.log('Processing new translated text:', newText)
        phraseAggregator.addPartial(targetText)
        setLastProcessedText(targetText)
        
        // Save transcript if session is active
        if (currentSession && sessionStartTime && sourceText && targetText) {
          const now = Date.now()
          const t0Ms = sessionStartTime ? now - sessionStartTime : 0
          const t1Ms = t0Ms + 1000 // Approximate 1 second duration
          
          addTranscript(t0Ms, t1Ms, sourceText, targetText)
        }
      }
    }
  }, [targetText, lastProcessedText, phraseAggregator, mode, currentSession, sessionStartTime, sourceText, addTranscript])

  // Clear TTS when translation is cleared
  useEffect(() => {
    if (mode === 'realtime' && !targetText && lastProcessedText) {
      stopTTS()
      clearQueue()
      phraseAggregator.clear()
      setLastProcessedText('')
    }
  }, [targetText, lastProcessedText, stopTTS, clearQueue, phraseAggregator, mode])

  const handleStart = async () => {
    if (mode === 'realtime') {
      if (isConnected) {
        // Stopping translation - end session if active
        disconnect()
        stopTTS()
        clearQueue()
        
        if (currentSession) {
          await endSession()
          setSessionStartTime(null)
        }
      } else {
        // Starting translation - begin new session if history enabled
        connect()
        
        if (historyEnabled) {
          const session = await startSession(
            sourceLanguage,
            targetLanguage,
            mode === 'realtime' ? 'live' : 'ptt'
          )
          if (session) {
            setSessionStartTime(Date.now())
          }
        }
      }
    }
    // PTT mode doesn't need a start/stop connection - it's per-request
  }

  const swapLanguages = () => {
    if (sourceLanguage === 'auto') return
    
    const newSource = targetLanguage
    const newTarget = sourceLanguage
    setSourceLanguage(newSource)
    setTargetLanguage(newTarget)
    
    // Stop TTS when languages change
    stopTTS()
    clearQueue()
  }

  const handleClearTranslation = () => {
    if (mode === 'realtime') {
      clearTranslation()
    }
    
    // Clear PTT results
    if (ptt.hasResults) {
      ptt.clearResults()
    }
    
    stopTTS()
    clearQueue()
    phraseAggregator.clear()
    setLastProcessedText('')
  }

  const handleTTSToggle = () => {
    setTtsEnabled(!ttsEnabled)
    if (ttsEnabled) {
      stopTTS()
      clearQueue()
    }
  }

  // Mode switching handlers
  const handleModeSwitch = (newMode: TranslationMode) => {
    if (newMode === mode) return
    
    // Stop current activities
    if (mode === 'realtime' && isConnected) {
      disconnect()
    }
    if (ptt.isRecording) {
      ptt.cancelRecording()
    }
    
    stopTTS()
    clearQueue()
    
    setMode(newMode)
    setModeSwitch(null) // Clear auto-switch notification
    
    console.log(`Switched to ${newMode} mode`)
  }
  
  // Clear mode switch notification after delay
  useEffect(() => {
    if (modeSwitch) {
      const timer = setTimeout(() => {
        setModeSwitch(null)
      }, 5000) // Show for 5 seconds
      
      return () => clearTimeout(timer)
    }
  }, [modeSwitch])
  
  // Auto-switch back to realtime when connection quality improves
  useEffect(() => {
    if (autoSwitchEnabled && mode === 'ptt' && connectionMetrics) {
      const timeSinceSwitch = modeSwitch ? Date.now() - modeSwitch.timestamp : Infinity
      
      // Only auto-switch back after at least 10 seconds and if quality is good
      if (connectionMetrics.quality === 'excellent' && timeSinceSwitch > 10000) {
        console.log('Auto-switching back to realtime mode due to improved connection')
        setMode('realtime')
        setModeSwitch({ 
          reason: 'Connection quality improved. Switched back to real-time mode.',
          timestamp: Date.now()
        })
      }
    }
  }, [autoSwitchEnabled, mode, connectionMetrics, modeSwitch])

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Mode Selection & Language Selection */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Mode Toggle */}
        <div className="flex items-center justify-center space-x-2 mb-6">
          <span className="text-sm font-medium text-gray-700">Mode:</span>
          <button
            onClick={() => handleModeSwitch('realtime')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              mode === 'realtime' 
                ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            disabled={isConnected || ptt.isRecording || ptt.isProcessing}
          >
            Real-time
          </button>
          <button
            onClick={() => handleModeSwitch('ptt')}
            className={`px-4 py-2 text-sm rounded-lg transition-colors ${
              mode === 'ptt' 
                ? 'bg-green-100 text-green-800 border border-green-300' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            disabled={isConnected || ptt.isRecording || ptt.isProcessing}
          >
            Push-to-Talk
          </button>
          
          {/* Auto-switch toggle */}
          <div className="flex items-center space-x-2 ml-4">
            <input
              type="checkbox"
              id="auto-switch"
              checked={autoSwitchEnabled}
              onChange={(e) => setAutoSwitchEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="auto-switch" className="text-sm text-gray-600">
              Auto-switch
            </label>
          </div>
        </div>
        
        {/* Mode Switch Notification */}
        {modeSwitch && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-blue-800">{modeSwitch.reason}</p>
            </div>
          </div>
        )}
        
        {/* Language Selection */}
        <div className="flex items-center justify-center space-x-4">
          <div className="flex-1 max-w-xs">
            <LanguageSelector
              value={sourceLanguage}
              onChange={setSourceLanguage}
              allowAuto={true}
              label="From"
              disabled={isConnected || ptt.isRecording || ptt.isProcessing}
            />
          </div>
          
          <button
            onClick={swapLanguages}
            disabled={isConnected || sourceLanguage === 'auto' || ptt.isRecording || ptt.isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Swap languages"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          
          <div className="flex-1 max-w-xs">
            <LanguageSelector
              value={targetLanguage}
              onChange={setTargetLanguage}
              allowAuto={false}
              label="To"
              disabled={isConnected || ptt.isRecording || ptt.isProcessing}
            />
          </div>
        </div>
      </div>

      {/* Translation Display */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <TranslationDisplay
          sourceText={mode === 'realtime' ? sourceText : ptt.sourceText}
          targetText={mode === 'realtime' ? targetText : ptt.targetText}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          isListening={mode === 'realtime' ? isListening : ptt.vadState.isSpeaking}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col items-center space-y-6">
          {mode === 'realtime' ? (
            <>
              {/* Realtime Mode Controls */}
              <div className="flex flex-col items-center space-y-2">
                <AudioVisualizer 
                  isActive={isListening} 
                  audioLevel={audioLevel}
                  className="border border-gray-200 rounded-lg"
                />
                {isConnected && (
                  <p className="text-sm text-gray-600">
                    {isListening ? 'Listening...' : 'Speak to translate'}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleStart}
                  size="lg"
                  className={`px-8 py-4 ${isConnected ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'}`}
                >
                  {isConnected ? 'Stop Translation' : 'Start Live Translation'}
                </Button>
                
                {(isConnected || sourceText || targetText) && (
                  <Button
                    variant="outline"
                    onClick={handleClearTranslation}
                    size="lg"
                    className="px-6 py-4"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* PTT Mode Controls */}
              <PTTControls
                isRecording={ptt.isRecording}
                isProcessing={ptt.isProcessing}
                audioLevel={ptt.audioLevel}
                recordingDuration={ptt.recordingDuration}
                mode={pttMode}
                isSupported={ptt.isSupported}
                vadState={ptt.vadState}
                metrics={ptt.metrics}
                error={ptt.error}
                disabled={!ptt.canRecord}
                onStartRecording={ptt.startRecording}
                onStopRecording={ptt.stopRecording}
                onToggleRecording={ptt.toggleRecording}
                onCancelRecording={ptt.cancelRecording}
                onModeChange={setPttMode}
                className="w-full max-w-md"
              />
              
              {(ptt.hasResults || ptt.sourceText || ptt.targetText) && (
                <Button
                  variant="outline"
                  onClick={handleClearTranslation}
                  size="lg"
                  className="px-6 py-4"
                >
                  Clear Results
                </Button>
              )}
            </>
          )}

          {/* TTS Controls */}
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
              {/* TTS Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tts-enabled"
                  checked={ttsEnabled}
                  onChange={handleTTSToggle}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="tts-enabled" className="text-sm font-medium text-gray-700">
                  Text-to-Speech
                </label>
              </div>

              {/* Voice Indicator */}
              {ttsEnabled && (
                <div className="text-xs text-gray-500">
                  Voice: {targetLanguage.toUpperCase()}
                </div>
              )}
            </div>

            {/* Audio Controls */}
            {ttsEnabled && (audioState.isPlaying || audioState.isPaused || audioState.isLoading) && (
              <div className="w-full max-w-md">
                <AudioControls
                  isPlaying={audioState.isPlaying}
                  isPaused={audioState.isPaused}
                  isLoading={audioState.isLoading}
                  volume={audioState.volume}
                  currentTime={audioState.currentTime}
                  duration={audioState.duration}
                  onPlay={resumeTTS}
                  onPause={pauseTTS}
                  onStop={stopTTS}
                  onVolumeChange={setVolume}
                  showProgress={audioState.duration > 0}
                  showVolumeControl={true}
                  size="sm"
                  className="justify-center"
                />
              </div>
            )}
          </div>

          {/* Status and Metrics */}
          {(connectionError || ptt.error) && (
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">
                {mode === 'realtime' ? 'Connection Error' : 'PTT Error'}
              </p>
              <p className="text-red-600 text-sm">{connectionError || ptt.error}</p>
            </div>
          )}

          {/* Connection Quality Indicator */}
          {connectionMetrics && mode === 'realtime' && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Connection:</span>
              <div className={`flex items-center space-x-1 ${
                connectionMetrics.quality === 'excellent' ? 'text-green-600' :
                connectionMetrics.quality === 'good' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  connectionMetrics.quality === 'excellent' ? 'bg-green-500' :
                  connectionMetrics.quality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="capitalize">{connectionMetrics.quality}</span>
                <span className="text-gray-500">({connectionMetrics.rtt}ms)</span>
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {((mode === 'realtime' && latencyMetrics) || (mode === 'ptt' && ptt.metrics)) && (
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-gray-700 font-medium">Performance Metrics</p>
              {mode === 'realtime' && latencyMetrics && (
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm text-gray-600">
                  {latencyMetrics.total_latency_ms && (
                    <div>
                      <span className="font-medium">Total Latency:</span>
                      <span className={`ml-1 ${latencyMetrics.total_latency_ms > 700 ? 'text-red-600' : 'text-green-600'}`}>
                        {Math.round(latencyMetrics.total_latency_ms)}ms
                      </span>
                    </div>
                  )}
                  {latencyMetrics.webrtc_connection_ms && (
                    <div>
                      <span className="font-medium">Connection:</span>
                      <span className="ml-1">{Math.round(latencyMetrics.webrtc_connection_ms)}ms</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Usage Instructions */}
          <div className="text-center text-sm text-gray-500 max-w-md">
            {mode === 'realtime' ? (
              <p>
                Click "Start Live Translation" to begin. The system will listen continuously 
                and translate your speech in real-time. With Text-to-Speech enabled, 
                translations will be spoken aloud automatically. The audio will fade during 
                barge-in when you start speaking again.
              </p>
            ) : (
              <p>
                Use Push-to-Talk for better performance on slower connections. 
                Hold or click the microphone button to record your speech, then release 
                to process and translate. Voice Activity Detection will automatically 
                detect speech boundaries.
              </p>
            )}
            {autoSwitchEnabled && (
              <p className="mt-2 text-xs text-blue-600">
                Auto-switch is enabled. The system will automatically switch modes 
                based on connection quality (RTT threshold: 250ms).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* History Settings */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Translation History</h3>
        <HistoryToggle
          enabled={historyEnabled}
          onToggle={setHistoryEnabled}
          hasExistingData={false} // This would be fetched from the history hook
          className="max-w-2xl"
        />
        
        {currentSession && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Recording session:</strong> Your translations are being saved to history.
              {sessionStartTime && (
                <span className="ml-2">
                  Started {Math.floor((Date.now() - sessionStartTime) / 1000)}s ago
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}