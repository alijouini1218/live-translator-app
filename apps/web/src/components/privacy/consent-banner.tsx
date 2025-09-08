'use client'

import { useState, useEffect } from 'react'
import { Button } from '@live-translator/ui'

interface ConsentBannerProps {
  onAccept: () => void
  onDecline: () => void
}

export function ConsentBanner({ onAccept, onDecline }: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('live-translator-consent')
    if (!hasConsent) {
      // Delay showing banner to avoid layout shift
      const timer = setTimeout(() => setIsVisible(true), 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('live-translator-consent', 'accepted')
    localStorage.setItem('live-translator-consent-timestamp', new Date().toISOString())
    setIsVisible(false)
    onAccept()
  }

  const handleDecline = () => {
    localStorage.setItem('live-translator-consent', 'declined')
    localStorage.setItem('live-translator-consent-timestamp', new Date().toISOString())
    setIsVisible(false)
    onDecline()
  }

  if (!isVisible) return null

  return (
    <div 
      className="consent-banner slide-down"
      role="banner"
      aria-label="Privacy consent banner"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              <svg 
                className="w-5 h-5 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">
                Privacy Notice & Consent
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                Live Translator processes your voice data to provide real-time translation services. 
                We use microphone access, secure WebRTC connections, and AI services. 
                <button
                  onClick={() => window.open('/privacy', '_blank')}
                  className="text-white underline hover:text-gray-300 ml-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded"
                  aria-label="View privacy policy in new tab"
                >
                  View Privacy Policy
                </button>
                {' '}for details. You can manage settings anytime.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            className="bg-transparent border-white text-white hover:bg-white hover:text-black focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Decline privacy consent"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            className="bg-white text-black hover:bg-gray-100 focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
            aria-label="Accept privacy consent and continue"
          >
            Accept & Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

// Hook to check consent status
export function useConsentStatus() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null)

  useEffect(() => {
    const consent = localStorage.getItem('live-translator-consent')
    setHasConsent(consent === 'accepted')
  }, [])

  const revokeConsent = () => {
    localStorage.removeItem('live-translator-consent')
    localStorage.removeItem('live-translator-consent-timestamp')
    setHasConsent(null)
  }

  const getConsentTimestamp = () => {
    return localStorage.getItem('live-translator-consent-timestamp')
  }

  return {
    hasConsent,
    revokeConsent,
    getConsentTimestamp
  }
}