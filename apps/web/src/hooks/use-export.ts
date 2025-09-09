'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Session = Database['public']['Tables']['sessions']['Row']
type Transcript = Database['public']['Tables']['transcripts']['Row']

interface ExportOptions {
  format: 'txt' | 'json' | 'csv'
  includeTimestamps: boolean
  includeMetadata: boolean
  timestampFormat: '24h' | '12h' | 'relative'
}

interface ExportState {
  exporting: boolean
  error: string | null
}

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'txt',
  includeTimestamps: true,
  includeMetadata: true,
  timestampFormat: 'relative'
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    exporting: false,
    error: null
  })

  const supabase = createClient()

  // Format timestamp based on user preference
  const formatTimestamp = useCallback((ms: number, format: ExportOptions['timestampFormat'], sessionStart?: string) => {
    if (format === 'relative') {
      const seconds = Math.floor(ms / 1000)
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `[${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}]`
    }

    const date = sessionStart ? new Date(new Date(sessionStart).getTime() + ms) : new Date(ms)
    
    if (format === '12h') {
      return `[${date.toLocaleTimeString('en-US', { hour12: true })}]`
    }
    
    return `[${date.toLocaleTimeString('en-US', { hour12: false })}]`
  }, [])

  // Get language display names
  const getLanguageName = useCallback((code: string | null) => {
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
  }, [])

  // Export single session as text
  const exportSessionAsText = useCallback(async (
    sessionId: string, 
    options: Partial<ExportOptions> = {}
  ) => {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    
    try {
      setState(prev => ({ ...prev, exporting: true, error: null }))

      // Load session with transcripts
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single() as { data: Session | null, error: any }

      if (sessionError || !session) throw sessionError || new Error('Session not found')

      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('t0_ms', { ascending: true }) as { data: Transcript[] | null, error: any }

      if (transcriptsError || !transcripts) throw transcriptsError || new Error('Transcripts not found')

      // Generate filename
      const date = new Date(session.created_at)
      const dateStr = date.toISOString().split('T')[0]
      const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-')
      const sourceLanguage = getLanguageName(session.source_lang)
      const targetLanguage = getLanguageName(session.target_lang)
      
      const filename = `live-translator-${dateStr}-${timeStr}-${sourceLanguage.replace(/\s/g, '')}-${targetLanguage.replace(/\s/g, '')}.${opts.format}`

      let content = ''

      if (opts.format === 'txt') {
        // Header
        content += 'Live Translator Session Export\n'
        content += '================================\n\n'
        
        if (opts.includeMetadata) {
          content += `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`
          content += `Languages: ${sourceLanguage} → ${targetLanguage}\n`
          content += `Mode: ${session.mode === 'live' ? 'Live Translation' : 'Push-to-Talk'}\n`
          
          if (session.duration_ms) {
            const duration = Math.floor(session.duration_ms / 1000)
            const minutes = Math.floor(duration / 60)
            const seconds = duration % 60
            content += `Duration: ${minutes} minutes ${seconds} seconds\n`
          }
          
          content += `Transcripts: ${transcripts?.length || 0} segments\n`
          content += `Characters: ${session.characters}\n\n`
        }

        // Transcripts
        if (transcripts && transcripts.length > 0) {
          content += 'Transcripts:\n'
          content += '===========\n\n'
          
          for (const transcript of transcripts) {
            if (opts.includeTimestamps) {
              const timestamp = formatTimestamp(transcript.t0_ms, opts.timestampFormat, session.started_at)
              content += `${timestamp} ${transcript.source_text || ''}\n`
              
              if (transcript.target_text && transcript.target_text !== transcript.source_text) {
                const targetTimestamp = formatTimestamp(transcript.t1_ms, opts.timestampFormat, session.started_at)
                content += `${targetTimestamp} ${transcript.target_text}\n`
              }
            } else {
              content += `${transcript.source_text || ''}\n`
              if (transcript.target_text && transcript.target_text !== transcript.source_text) {
                content += `${transcript.target_text}\n`
              }
            }
            content += '\n'
          }
        } else {
          content += 'No transcripts recorded.\n'
        }
      } else if (opts.format === 'json') {
        const exportData = {
          session: {
            id: session.id,
            date: session.created_at,
            languages: {
              source: { code: session.source_lang, name: sourceLanguage },
              target: { code: session.target_lang, name: targetLanguage }
            },
            mode: session.mode,
            duration_ms: session.duration_ms,
            characters: session.characters
          },
          transcripts: transcripts?.map(t => ({
            timestamp_start_ms: t.t0_ms,
            timestamp_end_ms: t.t1_ms,
            source_text: t.source_text,
            target_text: t.target_text,
            created_at: t.created_at
          })) || []
        }
        content = JSON.stringify(exportData, null, 2)
      } else if (opts.format === 'csv') {
        content = 'timestamp_start_ms,timestamp_end_ms,source_text,target_text,created_at\n'
        
        if (transcripts) {
          for (const transcript of transcripts) {
            const escapeCsv = (text: string | null) => {
              if (!text) return '""'
              return `"${text.replace(/"/g, '""')}"`
            }
            
            content += `${transcript.t0_ms},${transcript.t1_ms},${escapeCsv(transcript.source_text)},${escapeCsv(transcript.target_text)},${transcript.created_at}\n`
          }
        }
      }

      // Create and download file
      const blob = new Blob([content], { type: opts.format === 'json' ? 'application/json' : 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)

      setState(prev => ({ ...prev, exporting: false }))
      return { success: true, filename }
    } catch (error) {
      console.error('Error exporting session:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export session'
      setState(prev => ({ ...prev, exporting: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
  }, [supabase, formatTimestamp, getLanguageName])

  // Export multiple sessions
  const exportMultipleSessions = useCallback(async (
    sessionIds: string[],
    options: Partial<ExportOptions> = {}
  ) => {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options }
    
    try {
      setState(prev => ({ ...prev, exporting: true, error: null }))

      // Load all sessions with transcripts
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .in('id', sessionIds)
        .order('created_at', { ascending: true }) as { data: Session[] | null, error: any }

      if (sessionsError || !sessions) throw sessionsError || new Error('Sessions not found')

      const { data: allTranscripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('*')
        .in('session_id', sessionIds)
        .order('session_id, t0_ms', { ascending: true }) as { data: Transcript[] | null, error: any }

      if (transcriptsError) throw transcriptsError

      // Group transcripts by session
      const transcriptsBySession = (allTranscripts || []).reduce((acc, transcript) => {
        if (!acc[transcript.session_id]) {
          acc[transcript.session_id] = []
        }
        acc[transcript.session_id].push(transcript)
        return acc
      }, {} as Record<string, Transcript[]>)

      // Generate filename
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `live-translator-export-${dateStr}-${sessionIds.length}-sessions.${opts.format}`

      let content = ''

      if (opts.format === 'txt') {
        content += 'Live Translator Multiple Sessions Export\n'
        content += '========================================\n\n'
        
        if (opts.includeMetadata) {
          content += `Export Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n`
          content += `Sessions: ${sessions?.length || 0}\n`
          content += `Total Transcripts: ${allTranscripts?.length || 0}\n\n`
        }

        if (sessions) {
          for (const session of sessions) {
            const transcripts = transcriptsBySession[session.id] || []
            const date = new Date(session.created_at)
            const sourceLanguage = getLanguageName(session.source_lang)
            const targetLanguage = getLanguageName(session.target_lang)
            
            content += `Session: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`
            content += `Languages: ${sourceLanguage} → ${targetLanguage}\n`
            content += `Mode: ${session.mode === 'live' ? 'Live Translation' : 'Push-to-Talk'}\n`
            
            if (session.duration_ms) {
              const duration = Math.floor(session.duration_ms / 1000)
              const minutes = Math.floor(duration / 60)
              const seconds = duration % 60
              content += `Duration: ${minutes} minutes ${seconds} seconds\n`
            }
            
            content += `Transcripts: ${transcripts.length} segments\n`
            content += '----------------------------------------\n\n'

            if (transcripts.length > 0) {
              for (const transcript of transcripts) {
                if (opts.includeTimestamps) {
                  const timestamp = formatTimestamp(transcript.t0_ms, opts.timestampFormat, session.started_at)
                  content += `${timestamp} ${transcript.source_text || ''}\n`
                  
                  if (transcript.target_text && transcript.target_text !== transcript.source_text) {
                    const targetTimestamp = formatTimestamp(transcript.t1_ms, opts.timestampFormat, session.started_at)
                    content += `${targetTimestamp} ${transcript.target_text}\n`
                  }
                } else {
                  content += `${transcript.source_text || ''}\n`
                  if (transcript.target_text && transcript.target_text !== transcript.source_text) {
                    content += `${transcript.target_text}\n`
                  }
                }
                content += '\n'
              }
            } else {
              content += 'No transcripts recorded.\n\n'
            }
            
            content += '\n========================================\n\n'
          }
        }
      } else if (opts.format === 'json') {
        const exportData = {
          export_date: new Date().toISOString(),
          sessions: sessions?.map(session => ({
            id: session.id,
            date: session.created_at,
            languages: {
              source: { code: session.source_lang, name: getLanguageName(session.source_lang) },
              target: { code: session.target_lang, name: getLanguageName(session.target_lang) }
            },
            mode: session.mode,
            duration_ms: session.duration_ms,
            characters: session.characters,
            transcripts: (transcriptsBySession[session.id] || []).map(t => ({
              timestamp_start_ms: t.t0_ms,
              timestamp_end_ms: t.t1_ms,
              source_text: t.source_text,
              target_text: t.target_text,
              created_at: t.created_at
            }))
          })) || []
        }
        content = JSON.stringify(exportData, null, 2)
      } else if (opts.format === 'csv') {
        content = 'session_id,session_date,source_language,target_language,mode,timestamp_start_ms,timestamp_end_ms,source_text,target_text,created_at\n'
        
        if (sessions) {
          for (const session of sessions) {
            const transcripts = transcriptsBySession[session.id] || []
            const sourceLanguage = getLanguageName(session.source_lang)
            const targetLanguage = getLanguageName(session.target_lang)
            
            for (const transcript of transcripts) {
              const escapeCsv = (text: string | null) => {
                if (!text) return '""'
                return `"${text.replace(/"/g, '""')}"`
              }
              
              content += `${session.id},${session.created_at},${escapeCsv(sourceLanguage)},${escapeCsv(targetLanguage)},${session.mode},${transcript.t0_ms},${transcript.t1_ms},${escapeCsv(transcript.source_text)},${escapeCsv(transcript.target_text)},${transcript.created_at}\n`
            }
          }
        }
      }

      // Create and download file
      const blob = new Blob([content], { type: opts.format === 'json' ? 'application/json' : 'text/plain' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)

      setState(prev => ({ ...prev, exporting: false }))
      return { success: true, filename }
    } catch (error) {
      console.error('Error exporting sessions:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to export sessions'
      setState(prev => ({ ...prev, exporting: false, error: errorMessage }))
      throw new Error(errorMessage)
    }
  }, [supabase, formatTimestamp, getLanguageName])

  // Export sessions by date range
  const exportByDateRange = useCallback(async (
    startDate: Date,
    endDate: Date,
    options: Partial<ExportOptions> = {}
  ) => {
    try {
      setState(prev => ({ ...prev, exporting: true, error: null }))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get all sessions in date range
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()) as { data: Pick<Session, 'id'>[] | null, error: any }

      if (error) throw error

      if (!sessions || sessions.length === 0) {
        setState(prev => ({ ...prev, exporting: false }))
        throw new Error('No sessions found in the specified date range')
      }

      const sessionIds = sessions.map(s => s.id)
      return await exportMultipleSessions(sessionIds, options)
    } catch (error) {
      console.error('Error exporting by date range:', error)
      setState(prev => ({ ...prev, exporting: false, error: error instanceof Error ? error.message : 'Export failed' }))
      throw error
    }
  }, [supabase, exportMultipleSessions])

  return {
    exporting: state.exporting,
    error: state.error,
    exportSession: exportSessionAsText,
    exportMultipleSessions,
    exportByDateRange
  }
}