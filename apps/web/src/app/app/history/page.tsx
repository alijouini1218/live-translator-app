'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, SessionCard, HistoryToggle, ExportDialog } from '@live-translator/ui'
import { useSessionHistory } from '@/hooks/use-session-history'
import { useExport } from '@/hooks/use-export'
import { 
  Search,
  Filter,
  Download,
  Calendar,
  Languages,
  MoreHorizontal,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react'

interface SessionFilters {
  dateFrom?: Date
  dateTo?: Date
  sourceLanguage?: string
  targetLanguage?: string
  mode?: 'live' | 'ptt'
  search?: string
}

export default function HistoryPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<SessionFilters>({})
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)

  const {
    sessions,
    loading,
    error,
    hasMore,
    totalCount,
    historyEnabled,
    loadMore,
    refresh,
    deleteSession,
    clearAllHistory,
    toggleHistory
  } = useSessionHistory(filters)

  const { exportSession, exportMultipleSessions, exporting } = useExport()

  // Handle session selection
  const handleSessionSelect = useCallback((sessionId: string, selected: boolean) => {
    setSelectedSessions(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(sessionId)
      } else {
        newSet.delete(sessionId)
      }
      return newSet
    })
  }, [])

  const selectAllSessions = useCallback(() => {
    setSelectedSessions(new Set(sessions.map(s => s.id)))
  }, [sessions])

  const deselectAllSessions = useCallback(() => {
    setSelectedSessions(new Set())
  }, [])

  // Navigation handlers
  const handleViewSession = useCallback((sessionId: string) => {
    router.push(`/app/history/${sessionId}`)
  }, [router])

  // Export handlers
  const handleExportSession = useCallback(async (sessionId: string) => {
    try {
      await exportSession(sessionId)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }, [exportSession])

  const handleBulkExport = useCallback(async (options: any) => {
    const sessionIds = Array.from(selectedSessions)
    if (sessionIds.length === 0) return

    try {
      await exportMultipleSessions(sessionIds, options)
      setSelectedSessions(new Set())
    } catch (error) {
      console.error('Bulk export failed:', error)
    }
  }, [exportMultipleSessions, selectedSessions])

  // Delete handlers
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      try {
        await deleteSession(sessionId)
        setSelectedSessions(prev => {
          const newSet = new Set(prev)
          newSet.delete(sessionId)
          return newSet
        })
      } catch (error) {
        console.error('Delete failed:', error)
      }
    }
  }, [deleteSession])

  const handleBulkDelete = useCallback(async () => {
    const sessionIds = Array.from(selectedSessions)
    if (sessionIds.length === 0) return

    const confirmMessage = sessionIds.length === 1 
      ? 'Are you sure you want to delete this session?'
      : `Are you sure you want to delete these ${sessionIds.length} sessions?`

    if (confirm(confirmMessage + ' This action cannot be undone.')) {
      try {
        await Promise.all(sessionIds.map(id => deleteSession(id)))
        setSelectedSessions(new Set())
      } catch (error) {
        console.error('Bulk delete failed:', error)
      }
    }
  }, [selectedSessions, deleteSession])

  const handleClearAllHistory = useCallback(async () => {
    if (confirm('Are you sure you want to clear all translation history? This action cannot be undone.')) {
      try {
        await clearAllHistory()
        setSelectedSessions(new Set())
      } catch (error) {
        console.error('Clear history failed:', error)
      }
    }
  }, [clearAllHistory])

  // Filter handlers
  const updateFilters = useCallback((newFilters: Partial<SessionFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Translation History</h2>
          <p className="mt-2 text-gray-600">
            View, export, and manage your translation sessions
          </p>
          {totalCount > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              {totalCount} session{totalCount !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        
        <Button 
          onClick={() => router.push('/app')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Start Translating
        </Button>
      </div>

      {/* History Toggle */}
      <HistoryToggle
        enabled={historyEnabled || false}
        onToggle={toggleHistory}
        hasExistingData={totalCount > 0}
        onClearHistory={handleClearAllHistory}
      />

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search translations..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={filters.search || ''}
              onChange={(e) => updateFilters({ search: e.target.value })}
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.dateFrom?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateFilters({ 
                  dateFrom: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.dateTo?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateFilters({ 
                  dateTo: e.target.value ? new Date(e.target.value) : undefined 
                })}
              />
            </div>

            {/* Language Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.targetLanguage || 'all'}
                onChange={(e) => updateFilters({ 
                  targetLanguage: e.target.value === 'all' ? undefined : e.target.value 
                })}
              >
                <option value="all">All Languages</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
              </select>
            </div>

            {/* Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                value={filters.mode || 'all'}
                onChange={(e) => updateFilters({ 
                  mode: e.target.value === 'all' ? undefined : e.target.value as 'live' | 'ptt'
                })}
              >
                <option value="all">All Modes</option>
                <option value="live">Live Translation</option>
                <option value="ptt">Push-to-Talk</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectedSessions.size === sessions.length ? deselectAllSessions : selectAllSessions}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {selectedSessions.size === sessions.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span>
                    {selectedSessions.size === 0 
                      ? 'Select All' 
                      : selectedSessions.size === sessions.length 
                        ? 'Deselect All'
                        : `${selectedSessions.size} Selected`
                    }
                  </span>
                </button>
              </div>
            </div>

            {selectedSessions.size > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                  disabled={exporting}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export ({selectedSessions.size})
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedSessions.size})
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions List */}
      <div className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">Error loading sessions</p>
            <p className="text-red-600 text-sm">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {sessions.length > 0 ? (
          <>
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onView={handleViewSession}
                onExport={handleExportSession}
                onDelete={handleDeleteSession}
                isSelected={selectedSessions.has(session.id)}
                onSelect={handleSessionSelect}
                showActions={true}
              />
            ))}

            {hasMore && (
              <div className="text-center">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More Sessions'}
                </Button>
              </div>
            )}
          </>
        ) : !loading && historyEnabled ? (
          <div className="text-center py-12">
            <Languages className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No translation sessions yet
            </h3>
            <p className="mt-2 text-gray-500">
              Start your first translation session to see history here.
            </p>
            <Button 
              className="mt-4 bg-blue-600 hover:bg-blue-700" 
              onClick={() => router.push('/app')}
            >
              Start Translating
            </Button>
          </div>
        ) : !loading && !historyEnabled ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400 bg-gray-100 rounded-full flex items-center justify-center">
              <Languages className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              History is disabled
            </h3>
            <p className="mt-2 text-gray-500">
              Enable translation history above to start saving your sessions.
            </p>
          </div>
        ) : null}

        {loading && sessions.length === 0 && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-24 rounded-lg animate-pulse" />
            ))}
          </div>
        )}
      </div>

      {/* Export Dialog */}
      <ExportDialog
        title={`Export ${selectedSessions.size} Session${selectedSessions.size !== 1 ? 's' : ''}`}
        description="Choose your export format and options"
        sessionCount={selectedSessions.size}
        onExport={handleBulkExport}
        isExporting={exporting}
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
      />
    </div>
  )
}