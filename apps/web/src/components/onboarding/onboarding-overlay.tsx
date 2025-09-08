'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@live-translator/ui'
import { useOnboarding } from './onboarding-context'

export function OnboardingOverlay() {
  const { state, nextStep, prevStep, skipStep, completeOnboarding } = useOnboarding()
  const overlayRef = useRef<HTMLDivElement>(null)
  const [highlightedElementRect, setHighlightedElementRect] = useState<DOMRect | null>(null)

  const currentStep = state.steps[state.currentStep]

  // Update highlighted element position
  useEffect(() => {
    if (!state.isActive || !currentStep?.target) {
      setHighlightedElementRect(null)
      return
    }

    const updateHighlight = () => {
      const targetElement = document.querySelector(currentStep.target!)
      if (targetElement) {
        setHighlightedElementRect(targetElement.getBoundingClientRect())
      } else {
        setHighlightedElementRect(null)
      }
    }

    updateHighlight()
    
    // Update on window resize or scroll
    window.addEventListener('resize', updateHighlight)
    window.addEventListener('scroll', updateHighlight, true)
    
    return () => {
      window.removeEventListener('resize', updateHighlight)
      window.removeEventListener('scroll', updateHighlight, true)
    }
  }, [state.isActive, currentStep?.target])

  // Handle keyboard navigation
  useEffect(() => {
    if (!state.isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          completeOnboarding()
          break
        case 'ArrowRight':
        case ' ':
          event.preventDefault()
          nextStep()
          break
        case 'ArrowLeft':
          event.preventDefault()
          prevStep()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [state.isActive, nextStep, prevStep, completeOnboarding])

  // Focus management
  useEffect(() => {
    if (state.isActive && overlayRef.current) {
      overlayRef.current.focus()
    }
  }, [state.isActive, state.currentStep])

  if (!state.isActive || !currentStep) {
    return null
  }

  const progress = ((state.currentStep + 1) / state.steps.length) * 100
  const isFirstStep = state.currentStep === 0
  const isLastStep = state.currentStep === state.steps.length - 1

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
      tabIndex={-1}
    >
      {/* Backdrop with highlight cutout */}
      <div className="absolute inset-0 bg-black bg-opacity-75">
        {highlightedElementRect && (
          <div
            className="absolute border-4 border-white rounded-lg shadow-lg"
            style={{
              left: highlightedElementRect.left - 8,
              top: highlightedElementRect.top - 8,
              width: highlightedElementRect.width + 16,
              height: highlightedElementRect.height + 16,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75)'
            }}
          />
        )}
      </div>

      {/* Onboarding content */}
      <div className="relative flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200 rounded-t-lg overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Onboarding progress: ${Math.round(progress)}%`}
            />
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {state.currentStep + 1}
                </div>
                <div>
                  <h2 id="onboarding-title" className="text-lg font-semibold text-gray-900">
                    {currentStep.title}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Step {state.currentStep + 1} of {state.steps.length}
                  </p>
                </div>
              </div>
              
              <button
                onClick={completeOnboarding}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                aria-label="Close onboarding"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <p id="onboarding-description" className="text-gray-700 mb-4">
                {currentStep.description}
              </p>
              
              {/* Custom content */}
              <div className="text-gray-600">
                {currentStep.content}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={prevStep}
                    size="sm"
                    aria-label="Go to previous step"
                  >
                    Previous
                  </Button>
                )}
                
                {currentStep.skippable !== false && !isLastStep && (
                  <Button
                    variant="ghost"
                    onClick={skipStep}
                    size="sm"
                    className="text-gray-500"
                    aria-label="Skip this step"
                  >
                    Skip
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isLastStep ? (
                  <Button
                    onClick={completeOnboarding}
                    size="sm"
                    aria-label="Complete onboarding"
                  >
                    Get Started
                  </Button>
                ) : (
                  <Button
                    onClick={nextStep}
                    size="sm"
                    aria-label="Continue to next step"
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Use <kbd className="shortcut-key">←</kbd> <kbd className="shortcut-key">→</kbd> arrow keys or <kbd className="shortcut-key">Space</kbd> to navigate, <kbd className="shortcut-key">Esc</kbd> to exit
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Announcement for screen readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Step {state.currentStep + 1} of {state.steps.length}: {currentStep.title}
      </div>
    </div>
  )
}

// Predefined onboarding flows
export const translatorOnboardingSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Live Translator',
    description: 'Let\'s get you started with voice-to-voice translation in just a few steps.',
    content: (
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Real-time voice translation</span>
        </div>
        <div className="flex items-center space-x-2 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Multiple language pairs</span>
        </div>
        <div className="flex items-center space-x-2 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Privacy-focused design</span>
        </div>
      </div>
    ),
    position: 'center'
  },
  {
    id: 'microphone',
    title: 'Microphone Access',
    description: 'We\'ll need access to your microphone to translate your speech.',
    target: '#global-mic-indicator',
    content: (
      <div>
        <p className="text-sm mb-3">
          The microphone indicator in the header shows your current permission status:
        </p>
        <ul className="text-sm space-y-2">
          <li className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Green: Active and listening</span>
          </li>
          <li className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Blue: Permission granted, ready to use</span>
          </li>
          <li className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Red: Permission denied or error</span>
          </li>
        </ul>
      </div>
    ),
    position: 'bottom'
  },
  {
    id: 'translation-modes',
    title: 'Translation Modes',
    description: 'Choose between real-time and push-to-talk modes based on your needs.',
    content: (
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-sm mb-1">Real-time Mode</h4>
          <p className="text-sm text-gray-600">
            Continuous listening with instant translation. Best for conversations with good internet.
          </p>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-1">Push-to-Talk Mode</h4>
          <p className="text-sm text-gray-600">
            Hold spacebar or click to record. Better for poor connections or noisy environments.
          </p>
        </div>
      </div>
    ),
    position: 'center'
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Use keyboard shortcuts for faster navigation and control.',
    content: (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Show this help</span>
          <kbd className="shortcut-key">?</kbd>
        </div>
        <div className="flex justify-between">
          <span>Push-to-talk</span>
          <kbd className="shortcut-key">Space</kbd>
        </div>
        <div className="flex justify-between">
          <span>Stop/Cancel</span>
          <kbd className="shortcut-key">Esc</kbd>
        </div>
        <div className="flex justify-between">
          <span>Clear translation</span>
          <kbd className="shortcut-key">Ctrl</kbd> + <kbd className="shortcut-key">L</kbd>
        </div>
      </div>
    ),
    position: 'center'
  },
  {
    id: 'privacy-settings',
    title: 'Privacy & History',
    description: 'Control your data and privacy settings.',
    content: (
      <div className="space-y-3">
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm">
            <strong>Privacy First:</strong> Translation history is disabled by default. 
            Your conversations are processed in real-time and not stored unless you explicitly enable history.
          </p>
        </div>
        <div className="text-sm text-gray-600">
          <p>You can manage these settings anytime in the translation interface.</p>
        </div>
      </div>
    ),
    position: 'center'
  }
]