'use client'

import { useState } from 'react'
import { Switch } from '@radix-ui/react-switch'
import { Button } from './button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog'
import { Shield, Info, Database, Trash2 } from 'lucide-react'

interface HistoryToggleProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  hasExistingData?: boolean
  onClearHistory?: () => void
  className?: string
}

export function HistoryToggle({ 
  enabled, 
  onToggle, 
  hasExistingData = false,
  onClearHistory,
  className = '' 
}: HistoryToggleProps) {
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

  const handleToggle = (newValue: boolean) => {
    if (newValue && !enabled) {
      // Show privacy notice when enabling
      setShowPrivacyDialog(true)
    } else {
      onToggle(newValue)
    }
  }

  const handleConfirmEnable = () => {
    onToggle(true)
    setShowPrivacyDialog(false)
  }

  const handleConfirmClear = () => {
    if (onClearHistory) {
      onClearHistory()
    }
    setShowClearDialog(false)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-start space-x-3">
          <div className="flex items-center space-x-2 text-gray-700">
            <Database className="w-5 h-5" />
            <span className="font-medium">Translation History</span>
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mt-1">
              Save your translation sessions for export and review
            </p>
            {!enabled && (
              <div className="flex items-center space-x-1 mt-1">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 font-medium">
                  Privacy Protected - History Disabled
                </span>
              </div>
            )}
            {enabled && (
              <div className="flex items-center space-x-1 mt-1">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 font-medium">
                  History Enabled - Data Being Saved
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Switch
            checked={enabled}
            onCheckedChange={handleToggle}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
      </div>

      {/* Additional Actions */}
      {hasExistingData && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Info className="w-4 h-4" />
            <span>You have existing translation history</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearDialog(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear History
          </Button>
        </div>
      )}

      {/* Privacy Consent Dialog */}
      <Dialog open={showPrivacyDialog} onOpenChange={setShowPrivacyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span>Enable Translation History</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">What will be saved:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your spoken text and translations</li>
                <li>• Session timestamps and duration</li>
                <li>• Language pairs used</li>
                <li>• Translation mode (live/push-to-talk)</li>
              </ul>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Privacy Protection:</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• History is OFF by default</li>
                <li>• Only you can access your data</li>
                <li>• You can export or delete anytime</li>
                <li>• No retroactive data collection</li>
              </ul>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">You control your data:</h4>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Turn history on/off anytime</li>
                <li>• Export sessions as text files</li>
                <li>• Delete individual sessions</li>
                <li>• Clear all history instantly</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500">
              By enabling history, you consent to saving your translation data as described above. 
              This data helps you track your conversations and export them for your records.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowPrivacyDialog(false)}
              className="flex-1"
            >
              Keep Disabled
            </Button>
            <Button
              onClick={handleConfirmEnable}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Enable History
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear History Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              <span>Clear Translation History</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium mb-2">
                This will permanently delete all your translation history:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All saved sessions and transcripts</li>
                <li>• Session metadata and timestamps</li>
                <li>• Translation statistics</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600">
              <strong>This action cannot be undone.</strong> Consider exporting your history 
              first if you want to keep a copy for your records.
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowClearDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmClear}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Clear All History
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}