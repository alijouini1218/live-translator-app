'use client'

import { useState } from 'react'
import { Button } from './button'
import { Badge } from './badge'
import { 
  Calendar, 
  Clock, 
  Languages, 
  MessageSquare, 
  Download, 
  Eye, 
  Trash2, 
  MoreVertical,
  Mic,
  Radio
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

interface SessionCardProps {
  session: {
    id: string
    source_lang: string | null
    target_lang: string
    mode: string
    started_at: string
    ended_at: string | null
    duration_ms: number | null
    characters: number
    cost_cents: number
  }
  transcriptCount?: number
  onView?: (sessionId: string) => void
  onExport?: (sessionId: string) => void
  onDelete?: (sessionId: string) => void
  isSelected?: boolean
  onSelect?: (sessionId: string, selected: boolean) => void
  showActions?: boolean
  className?: string
}

export function SessionCard({ 
  session, 
  transcriptCount,
  onView,
  onExport,
  onDelete,
  isSelected = false,
  onSelect,
  showActions = true,
  className = '' 
}: SessionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const getLanguageName = (code: string | null) => {
    if (!code) return 'Auto-detect'
    
    const languages: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'auto': 'Auto-detect'
    }
    
    return languages[code] || code.toUpperCase()
  }

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return 'Unknown'
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes === 0) {
      return `${remainingSeconds}s`
    }
    
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`
    } else if (diffInHours < 48) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`
    } else {
      return `${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })} at ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(session.id)
    } catch (error) {
      console.error('Error deleting session:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onSelect) {
      onSelect(session.id, e.target.checked)
    }
  }

  const sourceLanguage = getLanguageName(session.source_lang)
  const targetLanguage = getLanguageName(session.target_lang)

  return (
    <div className={`
      relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow
      ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'}
      ${className}
    `}>
      {/* Selection Checkbox */}
      {onSelect && (
        <div className="absolute top-4 left-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
      )}

      <div className={`${onSelect ? 'ml-8' : ''}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Languages className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">
                {sourceLanguage} → {targetLanguage}
              </span>
              <Badge variant={session.mode === 'live' ? 'default' : 'secondary'}>
                {session.mode === 'live' ? (
                  <>
                    <Radio className="w-3 h-3 mr-1" />
                    Live
                  </>
                ) : (
                  <>
                    <Mic className="w-3 h-3 mr-1" />
                    PTT
                  </>
                )}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(session.started_at)}</span>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onView && (
                  <DropdownMenuItem onClick={() => onView(session.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                )}
                {onExport && (
                  <DropdownMenuItem onClick={() => onExport(session.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-1 text-gray-600">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(session.duration_ms)}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-gray-600">
            <MessageSquare className="w-3 h-3" />
            <span>{transcriptCount || 0} segments</span>
          </div>
          
          <div className="text-gray-600">
            <span className="font-medium">{session.characters}</span> chars
          </div>
          
          {session.cost_cents > 0 && (
            <div className="text-gray-600">
              <span className="font-medium">${(session.cost_cents / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Quick Actions (when not in selection mode) */}
        {!onSelect && showActions && (
          <div className="flex items-center space-x-2 mt-4">
            {onView && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onView(session.id)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
            )}
            
            {onExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport(session.id)}
                className="text-xs"
              >
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SessionCard