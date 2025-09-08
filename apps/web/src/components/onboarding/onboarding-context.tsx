'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface OnboardingStep {
  id: string
  title: string
  description: string
  target?: string // CSS selector for element to highlight
  content: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  skippable?: boolean
  completed?: boolean
}

export interface OnboardingState {
  isActive: boolean
  currentStep: number
  steps: OnboardingStep[]
  hasSeenOnboarding: boolean
  showTooltips: boolean
}

interface OnboardingContextType {
  state: OnboardingState
  startOnboarding: (steps: OnboardingStep[]) => void
  nextStep: () => void
  prevStep: () => void
  skipStep: () => void
  completeOnboarding: () => void
  restartOnboarding: () => void
  setShowTooltips: (show: boolean) => void
  markStepCompleted: (stepId: string) => void
}

const OnboardingContext = createContext<OnboardingContextType | null>(null)

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    isActive: false,
    currentStep: 0,
    steps: [],
    hasSeenOnboarding: false,
    showTooltips: true
  })

  // Load onboarding state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('live-translator-onboarding')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setState(prev => ({
          ...prev,
          hasSeenOnboarding: parsed.hasSeenOnboarding || false,
          showTooltips: parsed.showTooltips !== false
        }))
      } catch (error) {
        console.error('Error loading onboarding state:', error)
      }
    }
  }, [])

  // Save onboarding state to localStorage
  const saveState = (newState: Partial<OnboardingState>) => {
    const stateToSave = {
      hasSeenOnboarding: newState.hasSeenOnboarding ?? state.hasSeenOnboarding,
      showTooltips: newState.showTooltips ?? state.showTooltips
    }
    localStorage.setItem('live-translator-onboarding', JSON.stringify(stateToSave))
  }

  const startOnboarding = (steps: OnboardingStep[]) => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      steps
    }))
    
    // Focus management for accessibility
    document.body.style.overflow = 'hidden'
  }

  const nextStep = () => {
    setState(prev => {
      const nextStepIndex = prev.currentStep + 1
      if (nextStepIndex >= prev.steps.length) {
        completeOnboarding()
        return prev
      }
      return {
        ...prev,
        currentStep: nextStepIndex
      }
    })
  }

  const prevStep = () => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1)
    }))
  }

  const skipStep = () => {
    const currentStepData = state.steps[state.currentStep]
    if (currentStepData?.skippable !== false) {
      nextStep()
    }
  }

  const completeOnboarding = () => {
    setState(prev => ({
      ...prev,
      isActive: false,
      hasSeenOnboarding: true
    }))
    
    saveState({ hasSeenOnboarding: true })
    document.body.style.overflow = ''
    
    // Announce completion for screen readers
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = 'Onboarding completed successfully.'
    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }

  const restartOnboarding = () => {
    setState(prev => ({
      ...prev,
      hasSeenOnboarding: false,
      currentStep: 0
    }))
    saveState({ hasSeenOnboarding: false })
  }

  const setShowTooltips = (show: boolean) => {
    setState(prev => ({ ...prev, showTooltips: show }))
    saveState({ showTooltips: show })
  }

  const markStepCompleted = (stepId: string) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      )
    }))
  }

  return (
    <OnboardingContext.Provider
      value={{
        state,
        startOnboarding,
        nextStep,
        prevStep,
        skipStep,
        completeOnboarding,
        restartOnboarding,
        setShowTooltips,
        markStepCompleted
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}