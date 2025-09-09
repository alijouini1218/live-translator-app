'use client'

import { useState, useEffect } from 'react'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { OnboardingProvider } from '@/components/onboarding/onboarding-context'
import { OnboardingOverlay } from '@/components/onboarding/onboarding-overlay'
import { ConsentBanner, useConsentStatus } from '@/components/privacy/consent-banner'
import { MicrophoneIndicator, useMicrophonePermission } from '@/components/audio/microphone-indicator'
import { KeyboardShortcuts, useKeyboardShortcuts, commonShortcuts } from '@/components/keyboard/keyboard-shortcuts'
import { translatorOnboardingSteps } from '@/components/onboarding/onboarding-overlay'
import { createPortal } from 'react-dom'

interface AppLayoutWrapperProps {
  children: React.ReactNode
  user: any
  profile: any
}

export function AppLayoutWrapper({ children, user, profile }: AppLayoutWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const { hasConsent, isInitialized: consentInitialized } = useConsentStatus()
  const { status: micStatus, requestPermission, isInitialized: micInitialized } = useMicrophonePermission()
  const { shortcuts, addShortcuts } = useKeyboardShortcuts()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Add global keyboard shortcuts only after component is mounted
    if (mounted) {
      const globalShortcuts = [
        commonShortcuts.help(() => {
          // Show help overlay - this would be handled by the onboarding context
          console.log('Show help requested')
        }),
        commonShortcuts.escape(() => {
          // Global escape handler - close any open overlays
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        })
      ]

      addShortcuts(globalShortcuts)
    }
  }, [addShortcuts, mounted])

  const handleConsentAccept = () => {
    // Handle consent acceptance - could trigger onboarding
    console.log('Consent accepted')
  }

  const handleConsentDecline = () => {
    // Handle consent decline - redirect or show limited functionality
    console.log('Consent declined')
    window.location.href = '/'
  }

  if (!mounted || !consentInitialized || !micInitialized) {
    return null // Avoid hydration issues and wait for initialization
  }

  return (
    <ErrorBoundary>
      <OnboardingProvider>
        <div className="min-h-screen bg-background">
          {/* Consent Banner */}
          {hasConsent === null && (
            <ConsentBanner
              onAccept={handleConsentAccept}
              onDecline={handleConsentDecline}
            />
          )}

          {/* Enhanced Header - Black with white text as per M7 specs */}
          <header className="header-black shadow-sm border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold">Live Translator</h1>
                  
                  {/* Global Microphone Indicator */}
                  <MicrophoneIndicator
                    status={micStatus}
                    onPermissionRequest={requestPermission}
                    showTooltip={true}
                    className="ml-2"
                  />
                </div>

                <nav className="flex space-x-6">
                  <a 
                    href="/app" 
                    className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
                    tabIndex={0}
                  >
                    Translate
                  </a>
                  <a 
                    href="/app/history" 
                    className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
                    tabIndex={0}
                  >
                    History
                  </a>
                  <a 
                    href="/app/billing" 
                    className="text-white hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black rounded px-2 py-1"
                    tabIndex={0}
                  >
                    Billing
                  </a>
                </nav>

                <div className="flex items-center space-x-4">
                  {/* Help shortcut indicator */}
                  <div className="text-sm text-gray-300 hidden sm:block">
                    Press <kbd className="inline-flex items-center justify-center min-w-5 h-5 px-1 text-xs font-mono bg-gray-700 text-gray-300 rounded border border-gray-600">?</kbd> for help
                  </div>
                  
                  {/* User Avatar placeholder - would be replaced with actual UserAvatar */}
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-medium">
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main content - Light grey background as per M7 specs */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>

          {/* Global Keyboard Shortcuts */}
          <KeyboardShortcuts shortcuts={shortcuts} enabled={hasConsent === true} />

          {/* Onboarding Overlay */}
          <OnboardingOverlay />
        </div>
      </OnboardingProvider>
    </ErrorBoundary>
  )
}

// Hook to manage global app state - simplified to avoid cascading updates
export function useAppState() {
  const { hasConsent, isInitialized: consentInitialized } = useConsentStatus()
  const { status: micStatus, isInitialized: micInitialized } = useMicrophonePermission()
  
  // Calculate app ready state without additional state updates
  const appReady = consentInitialized && micInitialized && hasConsent === true && micStatus !== 'requesting'

  return {
    appReady,
    hasConsent,
    micStatus,
    consentInitialized,
    micInitialized
  }
}