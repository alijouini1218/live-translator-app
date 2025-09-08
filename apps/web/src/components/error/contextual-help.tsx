'use client'

import { useState } from 'react'
import { Button } from '@live-translator/ui/components/button'

export interface HelpTopic {
  id: string
  title: string
  content: React.ReactNode
  category: 'connection' | 'microphone' | 'translation' | 'general'
}

interface ContextualHelpProps {
  topics: HelpTopic[]
  className?: string
  compact?: boolean
}

export function ContextualHelp({ topics, className = '', compact = false }: ContextualHelpProps) {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(!compact)

  const categorizedTopics = topics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = []
    }
    acc[topic.category].push(topic)
    return acc
  }, {} as Record<string, HelpTopic[]>)

  const categoryLabels = {
    connection: 'Connection Issues',
    microphone: 'Microphone Problems',
    translation: 'Translation Issues',
    general: 'General Help'
  }

  if (compact && !isExpanded) {
    return (
      <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center space-x-2 text-blue-700 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Need help?</span>
        </button>
      </div>
    )
  }

  return (
    <div className={`bg-card border border-border rounded-lg ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Help & Troubleshooting</h3>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
              aria-label="Collapse help"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex">
        {/* Topic categories sidebar */}
        <div className="w-1/3 bg-muted/30 border-r border-border">
          <div className="p-4">
            <nav className="space-y-2">
              {Object.entries(categorizedTopics).map(([category, categoryTopics]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </h4>
                  <div className="space-y-1 mb-4">
                    {categoryTopics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => setSelectedTopic(topic.id)}
                        className={`
                          w-full text-left px-3 py-2 text-sm rounded-md transition-colors
                          ${selectedTopic === topic.id 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                          }
                        `}
                      >
                        {topic.title}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>
        </div>

        {/* Topic content */}
        <div className="flex-1 p-4">
          {selectedTopic ? (
            <div>
              {(() => {
                const topic = topics.find(t => t.id === selectedTopic)
                if (!topic) return null
                
                return (
                  <div>
                    <h4 className="text-lg font-medium text-foreground mb-4">{topic.title}</h4>
                    <div className="text-muted-foreground prose prose-sm max-w-none">
                      {topic.content}
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-muted-foreground mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-lg font-medium text-foreground mb-2">Select a Help Topic</h4>
              <p className="text-muted-foreground">Choose a topic from the sidebar to get help and troubleshooting tips.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Common help topics for Live Translator
export const translatorHelpTopics: HelpTopic[] = [
  {
    id: 'mic-permission-denied',
    title: 'Microphone Permission Denied',
    category: 'microphone',
    content: (
      <div className="space-y-4">
        <p>If your microphone permission is denied, try these steps:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click the microphone icon in your browser's address bar</li>
          <li>Select "Always allow" for microphone access</li>
          <li>Refresh the page after changing permissions</li>
          <li>If using Chrome, go to Settings → Privacy and Security → Site Settings → Microphone</li>
        </ol>
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Some browsers require HTTPS for microphone access. Make sure you're using a secure connection.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'poor-connection',
    title: 'Poor Connection Quality',
    category: 'connection',
    content: (
      <div className="space-y-4">
        <p>If you're experiencing poor connection quality or high latency:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Switch to Push-to-Talk mode for better performance on slow connections</li>
          <li>Check your internet connection speed and stability</li>
          <li>Close other bandwidth-intensive applications</li>
          <li>Try moving closer to your WiFi router</li>
          <li>Consider switching to a mobile data connection if WiFi is unstable</li>
        </ul>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            The app automatically switches to PTT mode when RTT exceeds 250ms to maintain quality.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'translation-accuracy',
    title: 'Improving Translation Accuracy',
    category: 'translation',
    content: (
      <div className="space-y-4">
        <p>To get the best translation results:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Speak clearly and at a moderate pace</li>
          <li>Use a quiet environment with minimal background noise</li>
          <li>Pause briefly between sentences</li>
          <li>Avoid using slang, idioms, or highly technical terms</li>
          <li>Ensure your microphone is positioned correctly (6-12 inches from your mouth)</li>
        </ul>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Tip:</strong> The system works best with complete sentences rather than single words or fragments.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'audio-not-working',
    title: 'Audio Playback Issues',
    category: 'microphone',
    content: (
      <div className="space-y-4">
        <p>If you're not hearing translated audio:</p>
        <ol className="list-decimal list-inside space-y-2">
          <li>Check that Text-to-Speech is enabled in the interface</li>
          <li>Verify your device volume is turned up</li>
          <li>Test your speakers/headphones with other applications</li>
          <li>Try refreshing the page to reset audio context</li>
          <li>Check if another tab or application is blocking audio</li>
        </ol>
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            Some browsers require user interaction before playing audio. Try clicking anywhere on the page first.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts Guide',
    category: 'general',
    content: (
      <div className="space-y-4">
        <p>Use these keyboard shortcuts for faster control:</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h5 className="font-medium mb-2">General</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Show help</span>
                <kbd className="shortcut-key">?</kbd>
              </div>
              <div className="flex justify-between">
                <span>Escape/Stop</span>
                <kbd className="shortcut-key">Esc</kbd>
              </div>
            </div>
          </div>
          <div>
            <h5 className="font-medium mb-2">Translation</h5>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Push-to-talk</span>
                <kbd className="shortcut-key">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span>Clear text</span>
                <kbd className="shortcut-key">Ctrl+L</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'privacy-data',
    title: 'Privacy & Data Handling',
    category: 'general',
    content: (
      <div className="space-y-4">
        <p>Understanding how your data is handled:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Translation history is <strong>disabled by default</strong></li>
          <li>Audio is processed in real-time and not stored on our servers</li>
          <li>You can enable history for personal use, stored securely in your account</li>
          <li>All communications use encrypted connections (HTTPS/WSS)</li>
          <li>You can delete your history or account data anytime</li>
        </ul>
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <strong>Privacy First:</strong> We only process your data to provide translation services. No data is shared with third parties.
          </p>
        </div>
      </div>
    )
  }
]