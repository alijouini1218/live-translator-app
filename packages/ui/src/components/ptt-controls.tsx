'use client'

import React, { useState } from 'react'

interface PTTMetrics {
  sttLatency: number
  translationLatency: number
  ttsLatency: number
  totalLatency: number
  audioSize: number
  recordingDuration: number
}

interface VADState {
  isActive: boolean
  isSpeaking: boolean
  confidence: number
  energy: number
}

interface PTTControlsProps {
  /** Whether currently recording */
  isRecording: boolean
  /** Whether currently processing */
  isProcessing: boolean
  /** Current audio level (0.0 - 1.0) */
  audioLevel: number
  /** Recording duration in ms */
  recordingDuration: number
  /** PTT mode */
  mode: 'hold' | 'toggle'
  /** Whether PTT is supported */
  isSupported: boolean
  /** VAD state */
  vadState?: VADState
  /** Processing metrics */
  metrics?: PTTMetrics | null
  /** Error message */
  error?: string | null
  /** Whether controls are disabled */
  disabled?: boolean
  /** Start recording callback */
  onStartRecording: () => void
  /** Stop recording callback */
  onStopRecording: () => void
  /** Toggle recording callback */
  onToggleRecording: () => void
  /** Cancel recording callback */
  onCancelRecording: () => void
  /** Mode change callback */
  onModeChange?: (mode: 'hold' | 'toggle') => void
  /** Custom CSS classes */
  className?: string
}

export function PTTControls({
  isRecording,
  isProcessing,
  audioLevel,
  recordingDuration,
  mode,
  isSupported,
  vadState,
  metrics,
  error,
  disabled = false,
  onStartRecording,
  onStopRecording,
  onToggleRecording,
  onCancelRecording,
  onModeChange,
  className = '',
}: PTTControlsProps) {
  const [showMetrics, setShowMetrics] = useState(false)

  // Format duration as MM:SS
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get button color based on state
  const getButtonColor = () => {
    if (isProcessing) return 'bg-yellow-500 hover:bg-yellow-600'
    if (isRecording) return 'bg-red-500 hover:bg-red-600'
    return 'bg-blue-500 hover:bg-blue-600'
  }

  // Get button text based on state and mode
  const getButtonText = () => {
    if (isProcessing) return 'Processing...'
    if (isRecording) {
      return mode === 'hold' ? 'Release to Send' : 'Stop Recording'
    }
    return mode === 'hold' ? 'Hold to Talk' : 'Start Recording'
  }

  // Handle mouse/touch events for hold mode
  const handleMouseDown = () => {
    if (mode === 'hold' && !isRecording && !isProcessing && !disabled) {
      onStartRecording()
    }
  }

  const handleMouseUp = () => {
    if (mode === 'hold' && isRecording) {
      onStopRecording()
    }
  }

  // Handle click for toggle mode
  const handleClick = () => {
    if (mode === 'toggle' && !disabled) {
      onToggleRecording()
    }
  }

  if (!isSupported) {
    return (
      <div className={`text-center p-4 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Push-to-Talk Not Supported</p>
          <p className="text-red-600 text-sm mt-1">
            Your browser doesn't support audio recording. Please try a modern browser like Chrome, Firefox, or Safari.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mode Toggle */}
      {onModeChange && (
        <div className="flex items-center justify-center space-x-2 text-sm">
          <span className="text-gray-600">Mode:</span>
          <button
            onClick={() => onModeChange('hold')}
            className={`px-3 py-1 rounded ${
              mode === 'hold' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            disabled={isRecording || isProcessing}
          >
            Hold to Talk
          </button>
          <button
            onClick={() => onModeChange('toggle')}
            className={`px-3 py-1 rounded ${
              mode === 'toggle' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            disabled={isRecording || isProcessing}
          >
            Click to Toggle
          </button>
        </div>
      )}

      {/* Recording Button */}
      <div className="flex flex-col items-center space-y-4">
        <button
          className={`
            relative w-24 h-24 rounded-full transition-all duration-200 
            ${getButtonColor()} 
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
            ${isRecording ? 'animate-pulse shadow-lg shadow-red-500/50' : ''}
            ${isProcessing ? 'animate-spin' : ''}
            disabled:hover:scale-100 disabled:active:scale-100
          `}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onClick={handleClick}
          disabled={disabled}
        >
          {/* Microphone Icon */}
          <div className="flex items-center justify-center w-full h-full">
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </div>

          {/* Audio Level Ring */}
          {isRecording && (
            <div
              className="absolute inset-0 rounded-full border-4 border-white/30"
              style={{
                transform: `scale(${1 + audioLevel * 0.3})`,
                borderWidth: `${2 + audioLevel * 6}px`,
              }}
            />
          )}
        </button>

        {/* Button Label */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-700">{getButtonText()}</p>
          {isRecording && (
            <p className="text-xs text-gray-500 mt-1">
              Duration: {formatDuration(recordingDuration)}
            </p>
          )}
        </div>
      </div>

      {/* Audio Visualization */}
      {(isRecording || vadState?.isActive) && (
        <div className="flex flex-col items-center space-y-2">
          {/* Audio Level Bar */}
          <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                vadState?.isSpeaking ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>

          {/* VAD Status */}
          {vadState && (
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <div className={`flex items-center space-x-1`}>
                <div
                  className={`w-2 h-2 rounded-full ${
                    vadState.isSpeaking ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                <span>{vadState.isSpeaking ? 'Speech' : 'Silence'}</span>
              </div>
              <div>
                Confidence: {(vadState.confidence * 100).toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Control Buttons */}
      {isRecording && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={onCancelRecording}
            className="px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          {mode === 'toggle' && (
            <button
              onClick={onStopRecording}
              className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Stop & Send
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm font-medium">Error</p>
          <p className="text-red-600 text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Metrics Display */}
      {metrics && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-700 text-sm font-medium">Performance Metrics</p>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              {showMetrics ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          <div className="text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total Latency:</span>
              <span className={metrics.totalLatency > 2000 ? 'text-red-600' : 'text-green-600'}>
                {metrics.totalLatency}ms
              </span>
            </div>
            
            {showMetrics && (
              <div className="mt-2 space-y-1 pl-2 border-l-2 border-gray-300">
                <div className="flex justify-between">
                  <span>STT:</span>
                  <span>{metrics.sttLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Translation:</span>
                  <span>{metrics.translationLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>TTS:</span>
                  <span>{metrics.ttsLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span>Audio Size:</span>
                  <span>{(metrics.audioSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span>Recording:</span>
                  <span>{formatDuration(metrics.recordingDuration)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-center text-xs text-gray-500 max-w-xs mx-auto">
        {mode === 'hold' ? (
          <p>Hold the button while speaking, then release to translate</p>
        ) : (
          <p>Click to start recording, click again to stop and translate</p>
        )}
      </div>
    </div>
  )
}