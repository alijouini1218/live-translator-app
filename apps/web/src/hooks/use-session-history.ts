'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Session = Database['public']['Tables']['sessions']['Row']
type Transcript = Database['public']['Tables']['transcripts']['Row']
type SessionWithTranscripts = Session & { transcripts: Transcript[] }

interface SessionFilters {
  dateFrom?: Date
  dateTo?: Date
  sourceLanguage?: string
  targetLanguage?: string
  mode?: 'live' | 'ptt' | 'all'
  search?: string
}

interface SessionHistoryState {
  sessions: Session[]
  loading: boolean
  error: string | null
  hasMore: boolean
  totalCount: number
}

interface SessionDetail {
  session: Session
  transcripts: Transcript[]
  loading: boolean
  error: string | null
}

export function useSessionHistory(filters?: SessionFilters, limit = 20) {
  const [state, setState] = useState<SessionHistoryState>({
    sessions: [],
    loading: true,
    error: null,
    hasMore: true,
    totalCount: 0
  })
  const [offset, setOffset] = useState(0)
  const [historyEnabled, setHistoryEnabled] = useState<boolean | null>(null)
  
  const supabase = createClient()

  // Check if user has history enabled in their preferences
  const checkHistoryEnabled = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      // Check if user has any sessions (indicates they've used history before)
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (error) throw error

      // For now, consider history enabled if they have any sessions
      // In a real implementation, you'd store this preference in user settings
      const hasHistory = (sessions && sessions.length > 0) || false
      setHistoryEnabled(hasHistory)
      return hasHistory
    } catch (error) {
      console.error('Error checking history status:', error)
      return false
    }
  }, [supabase])

  // Load sessions with filters
  const loadSessions = useCallback(async (reset = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState(prev => ({ ...prev, loading: false, error: 'Not authenticated' }))
        return
      }

      let query = supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString())
      }
      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString())
      }
      if (filters?.sourceLanguage && filters.sourceLanguage !== 'all') {
        query = query.eq('source_lang', filters.sourceLanguage)
      }
      if (filters?.targetLanguage && filters.targetLanguage !== 'all') {
        query = query.eq('target_lang', filters.targetLanguage)
      }
      if (filters?.mode && filters.mode !== 'all') {
        query = query.eq('mode', filters.mode)
      }

      // Apply pagination
      const currentOffset = reset ? 0 : offset
      query = query.range(currentOffset, currentOffset + limit - 1)

      const { data: sessions, error, count } = await query

      if (error) throw error

      setState(prev => ({
        ...prev,
        sessions: reset ? (sessions || []) : [...prev.sessions, ...(sessions || [])],
        loading: false,
        hasMore: (sessions?.length || 0) === limit,
        totalCount: count || 0
      }))

      if (reset) {
        setOffset(sessions?.length || 0)
      } else {
        setOffset(prev => prev + (sessions?.length || 0))
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load sessions'
      }))
    }
  }, [supabase, filters, offset, limit])

  // Load more sessions
  const loadMore = useCallback(() => {
    if (!state.loading && state.hasMore) {
      loadSessions(false)
    }
  }, [state.loading, state.hasMore, loadSessions])

  // Refresh sessions (reset to first page)
  const refresh = useCallback(() => {
    setOffset(0)
    loadSessions(true)
  }, [loadSessions])

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('id', sessionId)

      if (error) throw error

      // Remove from local state
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.filter(s => s.id !== sessionId),
        totalCount: Math.max(0, prev.totalCount - 1)
      }))

      return true
    } catch (error) {
      console.error('Error deleting session:', error)
      throw error
    }
  }, [supabase])

  // Clear all history
  const clearAllHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('sessions')
        .delete()
        .eq('user_id', user.id)

      if (error) throw error

      setState(prev => ({
        ...prev,
        sessions: [],
        totalCount: 0
      }))

      setHistoryEnabled(false)
      return true
    } catch (error) {
      console.error('Error clearing history:', error)
      throw error
    }
  }, [supabase])

  // Toggle history enabled state
  const toggleHistory = useCallback(async (enabled: boolean) => {
    // In a real implementation, you'd save this to user preferences
    setHistoryEnabled(enabled)
    
    if (!enabled) {
      // Optionally clear existing data when disabling
      // For now, we just update the local state
      return true
    }
    
    return true
  }, [])

  // Get session stats
  const getStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('session_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    } catch (error) {
      console.error('Error getting stats:', error)
      return null
    }
  }, [supabase])

  // Initial load
  useEffect(() => {
    checkHistoryEnabled()
    loadSessions(true)
  }, [checkHistoryEnabled, loadSessions])

  return {
    // State
    sessions: state.sessions,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    totalCount: state.totalCount,
    historyEnabled,
    
    // Actions
    loadMore,
    refresh,
    deleteSession,
    clearAllHistory,
    toggleHistory,
    getStats
  }
}

export function useSessionDetail(sessionId: string) {
  const [state, setState] = useState<SessionDetail>({
    session: null as any,
    transcripts: [],
    loading: true,
    error: null
  })

  const supabase = createClient()

  const loadSessionDetail = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Load session
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (sessionError) throw sessionError

      // Load transcripts
      const { data: transcripts, error: transcriptsError } = await supabase
        .from('transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('t0_ms', { ascending: true })

      if (transcriptsError) throw transcriptsError

      setState({
        session,
        transcripts: transcripts || [],
        loading: false,
        error: null
      })
    } catch (error) {
      console.error('Error loading session detail:', error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load session'
      }))
    }
  }, [supabase, sessionId])

  useEffect(() => {
    if (sessionId) {
      loadSessionDetail()
    }
  }, [sessionId, loadSessionDetail])

  return {
    session: state.session,
    transcripts: state.transcripts,
    loading: state.loading,
    error: state.error,
    refresh: loadSessionDetail
  }
}

// Hook for creating and managing sessions during live translation
export function useSessionManager() {
  const [currentSession, setCurrentSession] = useState<Session | null>(null)
  const [historyEnabled, setHistoryEnabled] = useState(false)
  
  const supabase = createClient()

  // Start a new session
  const startSession = useCallback(async (
    sourceLanguage: string,
    targetLanguage: string,
    mode: 'live' | 'ptt'
  ) => {
    if (!historyEnabled) return null

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data: session, error } = await (supabase
        .from('sessions') as any)
        .insert({
          user_id: user.id,
          source_lang: sourceLanguage === 'auto' ? null : sourceLanguage,
          target_lang: targetLanguage,
          mode,
          started_at: new Date().toISOString(),
          characters: 0,
          cost_cents: 0
        })
        .select()
        .single() as { data: Session | null, error: any }

      if (error) throw error

      setCurrentSession(session)
      return session
    } catch (error) {
      console.error('Error starting session:', error)
      return null
    }
  }, [supabase, historyEnabled])

  // End current session
  const endSession = useCallback(async () => {
    if (!currentSession) return

    try {
      const { error } = await (supabase
        .from('sessions') as any)
        .update({
          ended_at: new Date().toISOString(),
          duration_ms: Date.now() - new Date(currentSession.started_at).getTime()
        })
        .eq('id', currentSession.id)

      if (error) throw error

      setCurrentSession(null)
    } catch (error) {
      console.error('Error ending session:', error)
    }
  }, [supabase, currentSession])

  // Add transcript to current session
  const addTranscript = useCallback(async (
    t0Ms: number,
    t1Ms: number,
    sourceText: string,
    targetText: string
  ) => {
    if (!currentSession || !historyEnabled) return

    try {
      const { data: transcript, error } = await (supabase
        .from('transcripts') as any)
        .insert({
          session_id: currentSession.id,
          t0_ms: t0Ms,
          t1_ms: t1Ms,
          source_text: sourceText,
          target_text: targetText
        })
        .select()
        .single()

      if (error) throw error

      // Update session character count
      const characterCount = (sourceText.length + targetText.length)
      await (supabase
        .from('sessions') as any)
        .update({
          characters: currentSession.characters + characterCount
        })
        .eq('id', currentSession.id)

      return transcript
    } catch (error) {
      console.error('Error adding transcript:', error)
      return null
    }
  }, [supabase, currentSession, historyEnabled])

  return {
    currentSession,
    historyEnabled,
    setHistoryEnabled,
    startSession,
    endSession,
    addTranscript
  }
}