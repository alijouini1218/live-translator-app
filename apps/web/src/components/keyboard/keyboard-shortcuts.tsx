'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@live-translator/ui'

export interface ShortcutAction {
  key: string
  description: string
  action: () => void
  category: 'general' | 'translation' | 'navigation' | 'accessibility'
  disabled?: boolean
}

interface KeyboardShortcutsProps {
  shortcuts: ShortcutAction[]
  enabled?: boolean
}

export function KeyboardShortcuts({ shortcuts, enabled = true }: KeyboardShortcutsProps) {
  const [showHelp, setShowHelp] = useState(false)
  const pressedKeys = useRef(new Set<string>())
  const [currentlyPressed, setCurrentlyPressed] = useState<string[]>([])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const key = event.key.toLowerCase()
    
    // Add to pressed keys
    pressedKeys.current.add(key)
    setCurrentlyPressed(Array.from(pressedKeys.current))

    // Special handling for help overlay
    if (key === '?' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
      // Only show help if not typing in an input
      const activeElement = document.activeElement
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      )
      
      if (!isInputActive) {
        event.preventDefault()
        setShowHelp(true)
        return
      }
    }

    // Handle Escape key
    if (key === 'escape') {
      if (showHelp) {
        event.preventDefault()
        setShowHelp(false)
        return
      }
    }

    // Find and execute matching shortcut
    const matchingShortcut = shortcuts.find(shortcut => {
      const shortcutKey = shortcut.key.toLowerCase()
      
      // Handle special keys
      if (shortcutKey === 'space' && key === ' ') return true
      if (shortcutKey === 'enter' && key === 'enter') return true
      if (shortcutKey === 'escape' && key === 'escape') return true
      
      // Handle key combinations (e.g., "ctrl+c")
      if (shortcutKey.includes('+')) {
        const parts = shortcutKey.split('+')
        const mainKey = parts[parts.length - 1]
        const modifiers = parts.slice(0, -1)
        
        if (key !== mainKey) return false
        
        return modifiers.every(modifier => {
          switch (modifier) {
            case 'ctrl': return event.ctrlKey
            case 'alt': return event.altKey  
            case 'shift': return event.shiftKey
            case 'meta': return event.metaKey
            default: return false
          }
        })
      }
      
      // Simple key match
      return key === shortcutKey
    })

    if (matchingShortcut && !matchingShortcut.disabled) {
      // Prevent default browser behavior for our shortcuts
      const shouldPreventDefault = 
        matchingShortcut.key === 'space' ||
        matchingShortcut.key === 'escape' ||
        matchingShortcut.key.includes('+')
      
      if (shouldPreventDefault) {
        event.preventDefault()
      }
      
      matchingShortcut.action()
    }
  }, [shortcuts, enabled, showHelp])

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    const key = event.key.toLowerCase()
    pressedKeys.current.delete(key)
    setCurrentlyPressed(Array.from(pressedKeys.current))
  }, [])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, enabled])

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = []
    }
    acc[shortcut.category].push(shortcut)
    return acc
  }, {} as Record<string, ShortcutAction[]>)

  const categoryLabels = {
    general: 'General',
    translation: 'Translation',
    navigation: 'Navigation', 
    accessibility: 'Accessibility'
  }

  return (
    <>
      {/* Help overlay */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 id="shortcuts-title" className="text-xl font-semibold text-gray-900">
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                  aria-label="Close shortcuts help"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Use these keyboard shortcuts to navigate and control the application more efficiently.
              </p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="space-y-6">
                {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </h3>
                    <div className="space-y-2">
                      {categoryShortcuts.map((shortcut, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{shortcut.description}</span>
                          <div className="flex items-center space-x-1">
                            {shortcut.key.split('+').map((keyPart, keyIndex) => (
                              <span key={keyIndex}>
                                <kbd className="shortcut-key">
                                  {keyPart === ' ' ? 'Space' : 
                                   keyPart === 'escape' ? 'Esc' :
                                   keyPart === 'enter' ? 'Enter' :
                                   keyPart.toUpperCase()}
                                </kbd>
                                {keyIndex < shortcut.key.split('+').length - 1 && (
                                  <span className="text-gray-400 mx-1">+</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Press <kbd className="shortcut-key">?</kbd> to show/hide this help,{' '}
                  <kbd className="shortcut-key">Esc</kbd> to close
                </p>
                <Button
                  onClick={() => setShowHelp(false)}
                  size="sm"
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Currently pressed keys indicator (for debugging) */}
      {process.env.NODE_ENV === 'development' && currentlyPressed.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-lg text-xs font-mono z-40">
          Keys: {currentlyPressed.join(' + ')}
        </div>
      )}
    </>
  )
}

// Hook for managing keyboard shortcuts
export function useKeyboardShortcuts() {
  const [shortcuts, setShortcuts] = useState<ShortcutAction[]>([])
  const [enabled, setEnabled] = useState(true)

  const addShortcut = useCallback((shortcut: ShortcutAction) => {
    setShortcuts(prev => [...prev.filter(s => s.key !== shortcut.key), shortcut])
  }, [])

  const removeShortcut = useCallback((key: string) => {
    setShortcuts(prev => prev.filter(s => s.key !== key))
  }, [])

  const addShortcuts = useCallback((newShortcuts: ShortcutAction[]) => {
    setShortcuts(prev => {
      const filtered = prev.filter(s => !newShortcuts.some(ns => ns.key === s.key))
      return [...filtered, ...newShortcuts]
    })
  }, [])

  const clearShortcuts = useCallback(() => {
    setShortcuts([])
  }, [])

  const toggleEnabled = useCallback(() => {
    setEnabled(prev => !prev)
  }, [])

  return {
    shortcuts,
    enabled,
    addShortcut,
    removeShortcut,
    addShortcuts,
    clearShortcuts,
    setEnabled,
    toggleEnabled
  }
}

// Common shortcut configurations
export const commonShortcuts = {
  help: (action: () => void): ShortcutAction => ({
    key: '?',
    description: 'Show keyboard shortcuts help',
    category: 'general',
    action
  }),
  
  escape: (action: () => void): ShortcutAction => ({
    key: 'escape',
    description: 'Stop current action or close overlay',
    category: 'general', 
    action
  }),
  
  spacePTT: (action: () => void, disabled = false): ShortcutAction => ({
    key: ' ',
    description: 'Push-to-talk (hold spacebar)',
    category: 'translation',
    action,
    disabled
  }),
  
  toggleMode: (action: () => void): ShortcutAction => ({
    key: 't',
    description: 'Toggle translation mode',
    category: 'translation',
    action
  }),
  
  clearTranslation: (action: () => void): ShortcutAction => ({
    key: 'ctrl+l',
    description: 'Clear translation',
    category: 'translation',
    action
  })
}