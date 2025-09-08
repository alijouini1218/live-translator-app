'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, ExportDialog } from '@live-translator/ui'
import { useSessionDetail } from '@/hooks/use-session-history'
import { useExport } from '@/hooks/use-export'
import { 
  ArrowLeft,
  Download,
  Languages,
  Clock,
  Calendar,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Copy,
  CheckCircle,
  Radio,
  Mic,
  BarChart3
} from 'lucide-react'

interface SessionDetailPageProps {
  params: {
    sessionId: string
  }
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const router = useRouter()
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const { session, transcripts, loading, error, refresh } = useSessionDetail(params.sessionId)
  const { exportSession, exporting } = useExport()

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
      'hi': 'Hindi'
    }
    
    return languages[code] || code.toUpperCase()
  }

  const formatDuration = (durationMs: number | null) => {
    if (!durationMs) return 'Unknown'
    
    const seconds = Math.floor(durationMs / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const handleExport = async (options: any) => {
    try {
      await exportSession(params.sessionId, options)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleCopyText = async (text: string, type: 'source' | 'target') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(`${type}-${text}`)
      setTimeout(() => setCopiedText(null), 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handlePlayAudio = (text: string, language: string) => {
    if (playingAudio === text) {
      // Stop current audio
      speechSynthesis.cancel()
      setPlayingAudio(null)
      return
    }

    // Stop any current audio
    speechSynthesis.cancel()
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = language
    utterance.onend = () => setPlayingAudio(null)
    utterance.onerror = () => setPlayingAudio(null)
    
    setPlayingAudio(text)
    speechSynthesis.speak(utterance)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/app/history')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to History</span>
          </Button>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800">
            {error ? 'Error Loading Session' : 'Session Not Found'}
          </h3>
          <p className="mt-2 text-red-600">
            {error || 'The session you\'re looking for doesn\'t exist or has been deleted.'}
          </p>
          <div className="mt-4 flex space-x-3">
            <Button
              variant="outline"
              onClick={() => router.push('/app/history')}
            >
              Back to History
            </Button>
            {error && (
              <Button
                variant="outline"
                onClick={refresh}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const sourceLanguage = getLanguageName(session.source_lang)
  const targetLanguage = getLanguageName(session.target_lang)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/app/history')}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to History</span>
          </Button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <Languages className="h-6 w-6" />
              <span>{sourceLanguage} → {targetLanguage}</span>
            </h1>
            <p className="text-gray-600 flex items-center space-x-2 mt-1">
              {session.mode === 'live' ? (
                <Radio className="h-4 w-4 text-blue-600" />
              ) : (
                <Mic className="h-4 w-4 text-green-600" />
              )}
              <span>
                {session.mode === 'live' ? 'Live Translation' : 'Push-to-Talk'} Session
              </span>
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowExportDialog(true)}
          disabled={exporting}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export Session
        </Button>
      </div>

      {/* Session Metadata */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Session Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Date</p>
              <p className="text-sm text-gray-600">
                {new Date(session.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(session.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Clock className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Duration</p>
              <p className="text-sm text-gray-600">
                {formatDuration(session.duration_ms)}
              </p>
              {session.started_at && session.ended_at && (
                <p className="text-xs text-gray-500">
                  {new Date(session.started_at).toLocaleTimeString()} - {new Date(session.ended_at).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Transcripts</p>
              <p className="text-sm text-gray-600">
                {transcripts.length} segments
              </p>
              {transcripts.length > 0 && (
                <p className="text-xs text-gray-500">
                  Avg {Math.round(session.characters / transcripts.length)} chars/segment
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Characters</p>
              <p className="text-sm text-gray-600">
                {session.characters} total
              </p>
              {session.cost_cents > 0 && (
                <p className="text-xs text-gray-500">
                  ${(session.cost_cents / 100).toFixed(2)} cost
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transcripts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Translation Transcripts
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {transcripts.length > 0 
              ? `${transcripts.length} translation segments from this session`
              : 'No transcripts were recorded for this session'
            }
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {transcripts.length > 0 ? (
            transcripts.map((transcript, index) => (
              <div key={transcript.id} className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span className="font-medium">#{index + 1}</span>
                    <span>[{formatTimestamp(transcript.t0_ms)}]</span>
                    {transcript.t1_ms !== transcript.t0_ms && (
                      <span>- [{formatTimestamp(transcript.t1_ms)}]</span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Source Text */}
                  {transcript.source_text && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {sourceLanguage}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(transcript.source_text!, session.source_lang || 'en')}
                            className="h-6 w-6 p-0"
                          >
                            {playingAudio === transcript.source_text ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyText(transcript.source_text!, 'source')}
                            className="h-6 w-6 p-0"
                          >
                            {copiedText === `source-${transcript.source_text}` ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-900">{transcript.source_text}</p>
                    </div>
                  )}

                  {/* Target Text */}
                  {transcript.target_text && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">
                          {targetLanguage}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePlayAudio(transcript.target_text!, session.target_lang)}
                            className="h-6 w-6 p-0"
                          >
                            {playingAudio === transcript.target_text ? (
                              <VolumeX className="h-3 w-3" />
                            ) : (
                              <Volume2 className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyText(transcript.target_text!, 'target')}
                            className="h-6 w-6 p-0"
                          >
                            {copiedText === `target-${transcript.target_text}` ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-gray-900">{transcript.target_text}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-12 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No transcripts recorded
              </h3>
              <p className="mt-2 text-gray-500">
                This session didn't capture any translation transcripts.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        title="Export Session"
        description={`Export this ${session.mode} translation session between ${sourceLanguage} and ${targetLanguage}`}
        sessionCount={1}
        onExport={handleExport}
        isExporting={exporting}
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  )
}