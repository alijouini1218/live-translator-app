'use client'

import { useState, useEffect, useRef } from 'react'

export type MicrophoneStatus = 
  | 'inactive'      // No permission or not in use
  | 'requesting'    // Requesting permission
  | 'denied'        // Permission denied
  | 'granted'       // Permission granted but not active
  | 'active'        // Currently listening/recording
  | 'error'         // Error state

interface MicrophoneIndicatorProps {
  status: MicrophoneStatus
  audioLevel?: number
  className?: string
  showTooltip?: boolean
  onPermissionRequest?: () => void
}

export function MicrophoneIndicator({ 
  status, 
  audioLevel = 0, 
  className = '',
  showTooltip = true,
  onPermissionRequest 
}: MicrophoneIndicatorProps) {
  const [showPermissionTooltip, setShowPermissionTooltip] = useState(false)
  const tooltipTimeoutRef = useRef<NodeJS.Timeout>()

  // Show tooltip for permission request
  useEffect(() => {
    if (status === 'requesting') {
      setShowPermissionTooltip(true)
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowPermissionTooltip(false)
      }, 5000)
    } else {
      setShowPermissionTooltip(false)
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }

    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current)
      }
    }
  }, [status])

  const getStatusIcon = () => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
          </svg>
        )
      case 'granted':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
          </svg>
        )
      case 'denied':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
            <path d="M12 18v4"/>
            <path d="m3 3 18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd"/>
          </svg>
        )
      case 'requesting':
        return (
          <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" opacity="0.3"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" opacity="0.3"/>
            <path d="M12 18v4" opacity="0.3"/>
            <path d="M12 2a3 3 0 0 1 3 3v2" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" opacity="0.5"/>
            <path d="M19 10v1a7 7 0 0 1-14 0v-1" opacity="0.5"/>
            <path d="M12 18v4" opacity="0.5"/>
          </svg>
        )
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return 'Microphone active'
      case 'granted':
        return 'Microphone ready'
      case 'denied':
        return 'Microphone access denied'
      case 'error':
        return 'Microphone error'
      case 'requesting':
        return 'Requesting microphone access...'
      default:
        return 'Microphone inactive'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'text-green-600 border-green-600 bg-green-50'
      case 'granted':
        return 'text-blue-600 border-blue-600 bg-blue-50'
      case 'denied':
        return 'text-red-600 border-red-600 bg-red-50'
      case 'error':
        return 'text-red-600 border-red-600 bg-red-50'
      case 'requesting':
        return 'text-yellow-600 border-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 border-gray-300 bg-gray-50'
    }
  }

  const handleClick = () => {
    if (status === 'denied' && onPermissionRequest) {
      onPermissionRequest()
    }
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        onClick={handleClick}
        disabled={status === 'requesting'}
        className={`
          mic-indicator ${status === 'active' ? 'active' : 'inactive'}
          ${getStatusColor()}
          ${status === 'denied' ? 'cursor-pointer' : 'cursor-default'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          disabled:cursor-not-allowed disabled:opacity-50
        `}
        aria-label={getStatusText()}
        title={showTooltip ? getStatusText() : undefined}
      >
        {getStatusIcon()}
        
        {/* Audio level indicator */}
        {status === 'active' && audioLevel > 0 && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping"
            style={{
              animationDuration: `${Math.max(0.5, 2 - audioLevel)}s`,
              opacity: Math.min(0.8, audioLevel)
            }}
            aria-hidden="true"
          />
        )}
      </button>

      {/* Permission request tooltip */}
      {showPermissionTooltip && status === 'requesting' && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-black text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap">
          Please allow microphone access in your browser
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-black" aria-hidden="true" />
        </div>
      )}

      {/* Error recovery tooltip */}
      {status === 'denied' && showTooltip && (
        <div className="sr-only" id="mic-denied-help">
          Microphone access is required for voice translation. Click to retry permission request.
        </div>
      )}
    </div>
  )
}

// Hook for managing microphone permission state
export function useMicrophonePermission() {
  const [permissionStatus, setPermissionStatus] = useState<MicrophoneStatus>('inactive')
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  const checkPermission = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionStatus('inactive')
        return false
      }

      // Check if permissions API is available (not supported in all browsers)
      if (!navigator.permissions || !navigator.permissions.query) {
        setPermissionStatus('inactive')
        return false
      }

      // Check current permission status
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      
      switch (permission.state) {
        case 'granted':
          setPermissionStatus('granted')
          return true
        case 'denied':
          setPermissionStatus('denied')
          return false
        case 'prompt':
          setPermissionStatus('inactive')
          return false
        default:
          setPermissionStatus('inactive')
          return false
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error)
      // Don't set error status for permission checks, just set inactive
      setPermissionStatus('inactive')
      return false
    }
  }

  const requestPermission = async () => {
    try {
      setPermissionStatus('requesting')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true } 
      })
      
      setStream(mediaStream)
      setPermissionStatus('granted')
      return mediaStream
    } catch (error) {
      console.error('Error requesting microphone permission:', error)
      setPermissionStatus('denied')
      throw error
    }
  }

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setPermissionStatus('granted')
    }
  }

  const activateStream = () => {
    if (stream) {
      setPermissionStatus('active')
    }
  }

  useEffect(() => {
    if (!isInitialized) {
      checkPermission().finally(() => {
        setIsInitialized(true)
      })
    }
  }, [isInitialized])

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [stream])

  return {
    status: permissionStatus,
    stream,
    checkPermission,
    requestPermission,
    stopStream,
    activateStream,
    isInitialized
  }
}