'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button, AudioControls, PTTControls, HistoryToggle } from '@live-translator/ui'
import { LanguageSelector } from './language-selector'
import { TranslationDisplay } from './translation-display'
import { AudioVisualizer } from './audio-visualizer'
import { PerformanceDashboard, type PerformanceMetrics } from '@/components/analytics/performance-dashboard'
import { ContextualHelp, translatorHelpTopics } from '@/components/error/contextual-help'
import { useKeyboardShortcuts, commonShortcuts } from '@/components/keyboard/keyboard-shortcuts'
import { useMicrophonePermission } from '@/components/audio/microphone-indicator'
import { useOnboarding } from '@/components/onboarding/onboarding-context'
import { translatorOnboardingSteps } from '@/components/onboarding/onboarding-overlay'
import { useRealtimeTranslator } from '@/hooks/use-realtime-translator'
import { useTTS } from '@/hooks/use-tts'
import { usePTT } from '@/hooks/use-ptt'
import { useSessionManager } from '@/hooks/use-session-history'
import { createPhraseAggregator } from '@live-translator/core/phrase-aggregator'

interface EnhancedLiveTranslatorProps {
  className?: string
}

type TranslationMode = 'realtime' | 'ptt'

export function EnhancedLiveTranslator({ className = '' }: EnhancedLiveTranslatorProps) {
  const [sourceLanguage, setSourceLanguage] = useState('auto')
  const [targetLanguage, setTargetLanguage] = useState('es')
  const [mode, setMode] = useState<TranslationMode>('realtime')
  const [pttMode, setPttMode] = useState<'hold' | 'toggle'>('hold')
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showPerformance, setShowPerformance] = useState(false)
  
  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    connectionLatency: 0,
    connectionQuality: 'good',
    connectionDrops: 0,
    reconnections: 0,
    translationLatency: 0,
    totalLatency: 0,
    phraseCount: 0,
    audioQuality: 1,
    volumeLevel: 0,
    noiseLevel: 0,
    sessionDuration: 0,
    dataUsage: 0,
    errors: 0,
    warnings: 0,
    timestamp: Date.now()
  })

  // Session tracking
  const sessionStartRef = useRef<number | null>(null)
  const phraseCountRef = useRef(0)
  const dataUsageRef = useRef(0)
  
  const { shortcuts, addShortcuts } = useKeyboardShortcuts()
  const { status: micStatus, requestPermission } = useMicrophonePermission()
  const { startOnboarding, state: onboardingState } = useOnboarding()

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
      setPerformanceMetrics(prev => ({
        ...prev,
        errors: prev.errors + 1,
        timestamp: Date.now()
      }))
    },
    onLatencyUpdate: (metrics) => {
      setPerformanceMetrics(prev => ({
        ...prev,
        connectionLatency: metrics.webrtc_connection_ms || 0,
        translationLatency: metrics.translation_latency_ms || 0,
        totalLatency: metrics.total_latency_ms || 0,
        connectionQuality: metrics.total_latency_ms < 200 ? 'excellent' : 
                          metrics.total_latency_ms < 500 ? 'good' : 'poor',
        timestamp: Date.now()
      }))
    },
  })

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
    onPlayStart: () => console.log('TTS playback started'),
    onPlayEnd: () => console.log('TTS playback ended'),
    onError: (error) => {
      console.error('TTS error:', error)
      setPerformanceMetrics(prev => ({
        ...prev,
        errors: prev.errors + 1,
        timestamp: Date.now()
      }))
    },
    enableDucking: true,
    duckingVolume: 0.1,
    fadeTime: 300,
  })

  const ptt = usePTT({
    sourceLanguage,
    targetLanguage,
    mode: pttMode,
    onTranslation: async (sourceText, targetText) => {
      if (ttsEnabled && targetText.trim()) {
        speak(targetText)
      }
      
      phraseCountRef.current += 1
      setPerformanceMetrics(prev => ({
        ...prev,
        phraseCount: phraseCountRef.current,
        timestamp: Date.now()
      }))
    },
    onError: (error) => {
      console.error('PTT error:', error)
      setPerformanceMetrics(prev => ({
        ...prev,
        errors: prev.errors + 1,
        timestamp: Date.now()
      }))
    },
  })

  // Update performance metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionStartRef.current) {
        setPerformanceMetrics(prev => ({
          ...prev,
          sessionDuration: Date.now() - sessionStartRef.current!,
          volumeLevel: audioLevel,
          audioQuality: Math.random() * 0.3 + 0.7, // Simulated - would be real metric
          noiseLevel: Math.random() * 0.2, // Simulated - would be real metric
          timestamp: Date.now()
        }))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [audioLevel])

  // Keyboard shortcuts
  useEffect(() => {
    const translatorShortcuts = [
      commonShortcuts.spacePTT(() => {
        if (mode === 'ptt' && !ptt.isRecording) {
          ptt.startRecording()
        }
      }, mode !== 'ptt'),
      
      commonShortcuts.clearTranslation(() => {
        handleClearTranslation()
      }),
      
      commonShortcuts.toggleMode(() => {
        setMode(prev => prev === 'realtime' ? 'ptt' : 'realtime')
      }),
      
      {
        key: 'h',
        description: 'Toggle help panel',
        category: 'general' as const,
        action: () => setShowHelp(!showHelp)
      },
      
      {
        key: 'p',
        description: 'Toggle performance dashboard',
        category: 'general' as const,
        action: () => setShowPerformance(!showPerformance)
      }
    ]

    addShortcuts(translatorShortcuts)
  }, [addShortcuts, mode, ptt, showHelp, showPerformance])

  // Onboarding trigger for first-time users
  useEffect(() => {
    if (!onboardingState.hasSeenOnboarding && micStatus === 'granted') {
      const timer = setTimeout(() => {
        startOnboarding(translatorOnboardingSteps)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [onboardingState.hasSeenOnboarding, micStatus, startOnboarding])

  const handleStart = async () => {
    if (mode === 'realtime') {
      if (isConnected) {
        disconnect()
        stopTTS()
        clearQueue()
        sessionStartRef.current = null
        
        if (currentSession) {
          await endSession()
        }
      } else {
        connect()
        sessionStartRef.current = Date.now()
        phraseCountRef.current = 0
        dataUsageRef.current = 0
        
        if (historyEnabled) {
          await startSession(sourceLanguage, targetLanguage, mode)
        }
      }
    }
  }

  const handleClearTranslation = () => {
    if (mode === 'realtime') {
      clearTranslation()
    }
    
    if (ptt.hasResults) {
      ptt.clearResults()
    }
    
    stopTTS()
    clearQueue()
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Mode Selection & Language Selection */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-muted-foreground">Mode:</span>
              <button
                onClick={() => setMode('realtime')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  mode === 'realtime' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                disabled={isConnected || ptt.isRecording}
              >
                Real-time
              </button>
              <button
                onClick={() => setMode('ptt')}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  mode === 'ptt' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                disabled={isConnected || ptt.isRecording}
              >
                Push-to-Talk
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPerformance(!showPerformance)}
              className="text-xs"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Metrics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help
            </Button>
          </div>
        </div>
        
        {/* Language Selection */}
        <div className="flex items-center justify-center space-x-4">
          <div className="flex-1 max-w-xs">
            <LanguageSelector
              value={sourceLanguage}
              onChange={setSourceLanguage}
              allowAuto={true}
              label="From"
              disabled={isConnected || ptt.isRecording}
            />
          </div>
          
          <button
            onClick={() => {
              if (sourceLanguage !== 'auto') {
                setSourceLanguage(targetLanguage)
                setTargetLanguage(sourceLanguage)
              }
            }}
            disabled={isConnected || sourceLanguage === 'auto' || ptt.isRecording}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              disabled={isConnected || ptt.isRecording}
            />
          </div>
        </div>
      </div>

      {/* Performance Dashboard */}
      {showPerformance && (
        <PerformanceDashboard
          metrics={performanceMetrics}
          showHistoricalData={true}
          compact={false}
        />
      )}

      {/* Translation Display */}
      <div className="bg-card rounded-lg border border-border p-6">
        <TranslationDisplay
          sourceText={mode === 'realtime' ? sourceText : ptt.sourceText}
          targetText={mode === 'realtime' ? targetText : ptt.targetText}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          isListening={mode === 'realtime' ? isListening : ptt.vadState.isSpeaking}
        />
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex flex-col items-center space-y-6">
          {mode === 'realtime' ? (
            <>
              <div className="flex flex-col items-center space-y-2">
                <AudioVisualizer 
                  isActive={isListening} 
                  audioLevel={audioLevel}
                  className="border border-border rounded-lg"
                />
                {isConnected && (
                  <p className="text-sm text-muted-foreground">
                    {isListening ? 'Listening...' : 'Speak to translate'}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleStart}
                  size="lg"
                  className={`px-8 py-4 ${isConnected ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                >
                  {isConnected ? 'Stop Translation' : 'Start Live Translation'}
                </Button>
                
                {(isConnected || sourceText || targetText) && (
                  <Button
                    variant="outline"
                    onClick={handleClearTranslation}
                    size="lg"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
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
                >
                  Clear Results
                </Button>
              )}
            </>
          )}

          {/* TTS Controls */}
          <div className="flex flex-col items-center space-y-4 w-full max-w-md">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="tts-enabled"
                  checked={ttsEnabled}
                  onChange={(e) => setTtsEnabled(e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-ring"
                />
                <label htmlFor="tts-enabled" className="text-sm font-medium">
                  Text-to-Speech
                </label>
              </div>

              {ttsEnabled && (
                <div className="text-xs text-muted-foreground">
                  Voice: {targetLanguage.toUpperCase()}
                </div>
              )}
            </div>

            {ttsEnabled && (audioState.isPlaying || audioState.isPaused || audioState.isLoading) && (
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
                className="justify-center w-full"
              />
            )}
          </div>
        </div>
      </div>

      {/* History Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold mb-4">Translation History</h3>
        <HistoryToggle
          enabled={historyEnabled}
          onToggle={setHistoryEnabled}
          hasExistingData={false}
          className="max-w-2xl"
        />
      </div>

      {/* Help Panel */}
      {showHelp && (
        <ContextualHelp
          topics={translatorHelpTopics}
          className="border-border"
          compact={false}
        />
      )}
    </div>
  )
}