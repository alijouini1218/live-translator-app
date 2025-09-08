'use client'

import { useState, useEffect, useRef } from 'react'

export interface PerformanceMetrics {
  // Connection metrics
  connectionLatency: number
  connectionQuality: 'excellent' | 'good' | 'poor'
  connectionDrops: number
  reconnections: number
  
  // Translation metrics
  translationLatency: number
  totalLatency: number
  phraseCount: number
  accuracyScore?: number
  
  // Audio metrics
  audioQuality: number
  volumeLevel: number
  noiseLevel: number
  
  // Session metrics  
  sessionDuration: number
  dataUsage: number // KB
  
  // Error metrics
  errors: number
  warnings: number
  
  timestamp: number
}

interface PerformanceDashboardProps {
  metrics: PerformanceMetrics
  showHistoricalData?: boolean
  className?: string
  compact?: boolean
}

export function PerformanceDashboard({ 
  metrics, 
  showHistoricalData = false,
  className = '',
  compact = false 
}: PerformanceDashboardProps) {
  const [historicalMetrics, setHistoricalMetrics] = useState<PerformanceMetrics[]>([])
  const [showDetails, setShowDetails] = useState(!compact)
  
  useEffect(() => {
    if (showHistoricalData) {
      setHistoricalMetrics(prev => {
        const updated = [...prev, metrics]
        // Keep last 50 data points
        return updated.slice(-50)
      })
    }
  }, [metrics, showHistoricalData])

  const getLatencyColor = (latency: number) => {
    if (latency < 200) return 'performance-excellent'
    if (latency < 500) return 'performance-good'
    return 'performance-poor'
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'performance-excellent'
      case 'good': return 'performance-good'
      default: return 'performance-poor'
    }
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  const formatDataSize = (kb: number) => {
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  if (compact) {
    return (
      <div className={`bg-card rounded-lg border border-border p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Connection Quality Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                metrics.connectionQuality === 'excellent' ? 'bg-green-500' :
                metrics.connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium capitalize">
                {metrics.connectionQuality}
              </span>
            </div>

            {/* Latency */}
            <div className="text-sm">
              <span className="text-muted-foreground">Latency:</span>
              <span className={`ml-1 font-medium ${getLatencyColor(metrics.totalLatency)}`}>
                {Math.round(metrics.totalLatency)}ms
              </span>
            </div>

            {/* Phrase Count */}
            <div className="text-sm">
              <span className="text-muted-foreground">Phrases:</span>
              <span className="ml-1 font-medium">{metrics.phraseCount}</span>
            </div>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring rounded p-1"
            aria-label="Toggle detailed metrics"
          >
            <svg className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-border">
            <DetailedMetrics metrics={metrics} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg border border-border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Performance Analytics</h3>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Live Metrics</span>
        </div>
      </div>

      <DetailedMetrics metrics={metrics} />

      {/* Historical Chart (if enabled) */}
      {showHistoricalData && historicalMetrics.length > 1 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3">Latency Trend</h4>
          <LatencyChart data={historicalMetrics} />
        </div>
      )}
    </div>
  )
}

function DetailedMetrics({ metrics }: { metrics: PerformanceMetrics }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Connection Metrics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Connection</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Quality</span>
            <span className={`text-sm font-medium performance-indicator ${getQualityColor(metrics.connectionQuality)}`}>
              <div className={`w-2 h-2 rounded-full ${
                metrics.connectionQuality === 'excellent' ? 'bg-green-500' :
                metrics.connectionQuality === 'good' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="capitalize">{metrics.connectionQuality}</span>
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Latency</span>
            <span className="text-sm font-medium">{Math.round(metrics.connectionLatency)}ms</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Drops</span>
            <span className="text-sm font-medium">{metrics.connectionDrops}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Reconnections</span>
            <span className="text-sm font-medium">{metrics.reconnections}</span>
          </div>
        </div>
      </div>

      {/* Translation Metrics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Translation</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Total Latency</span>
            <span className={`text-sm font-medium ${getLatencyColor(metrics.totalLatency)}`}>
              {Math.round(metrics.totalLatency)}ms
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Processing</span>
            <span className="text-sm font-medium">{Math.round(metrics.translationLatency)}ms</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Phrases</span>
            <span className="text-sm font-medium">{metrics.phraseCount}</span>
          </div>
          
          {metrics.accuracyScore && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Accuracy</span>
              <span className="text-sm font-medium">{Math.round(metrics.accuracyScore * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Audio & Session Metrics */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Audio & Session</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Audio Quality</span>
            <span className="text-sm font-medium">{Math.round(metrics.audioQuality * 100)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Volume</span>
            <span className="text-sm font-medium">{Math.round(metrics.volumeLevel * 100)}%</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Duration</span>
            <span className="text-sm font-medium">{formatDuration(metrics.sessionDuration)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Data Usage</span>
            <span className="text-sm font-medium">{formatDataSize(metrics.dataUsage)}</span>
          </div>
          
          {(metrics.errors > 0 || metrics.warnings > 0) && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Issues</span>
              <div className="flex items-center space-x-2 text-sm font-medium">
                {metrics.errors > 0 && (
                  <span className="text-red-600">{metrics.errors} errors</span>
                )}
                {metrics.warnings > 0 && (
                  <span className="text-yellow-600">{metrics.warnings} warnings</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LatencyChart({ data }: { data: PerformanceMetrics[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    // Calculate chart dimensions
    const padding = 40
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    // Find min/max values
    const latencies = data.map(d => d.totalLatency)
    const minLatency = Math.min(...latencies)
    const maxLatency = Math.max(...latencies)
    const latencyRange = maxLatency - minLatency || 1

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (chartHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Vertical grid lines
    const timeStep = Math.max(1, Math.floor(data.length / 8))
    for (let i = 0; i < data.length; i += timeStep) {
      const x = padding + (chartWidth / (data.length - 1)) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Draw latency line
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index
      const y = padding + chartHeight - ((point.totalLatency - minLatency) / latencyRange) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()

    // Draw points
    ctx.fillStyle = '#3b82f6'
    data.forEach((point, index) => {
      const x = padding + (chartWidth / (data.length - 1)) * index
      const y = padding + chartHeight - ((point.totalLatency - minLatency) / latencyRange) * chartHeight

      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw labels
    ctx.fillStyle = '#6b7280'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'

    // Y-axis labels
    for (let i = 0; i <= 4; i++) {
      const value = minLatency + (latencyRange / 4) * i
      const y = height - padding - (chartHeight / 4) * i
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.round(value)}ms`, padding - 10, y + 4)
    }

    // X-axis labels (time)
    ctx.textAlign = 'center'
    for (let i = 0; i < data.length; i += timeStep) {
      const x = padding + (chartWidth / (data.length - 1)) * i
      const time = new Date(data[i].timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
      ctx.fillText(time, x, height - 10)
    }

  }, [data])

  return (
    <div className="bg-muted rounded-lg p-4">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        className="w-full h-48"
        style={{ maxHeight: '200px' }}
        aria-label="Latency over time chart"
      />
    </div>
  )
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

function formatDataSize(kb: number) {
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function getLatencyColor(latency: number) {
  if (latency < 200) return 'performance-excellent'
  if (latency < 500) return 'performance-good'
  return 'performance-poor'
}

function getQualityColor(quality: string) {
  switch (quality) {
    case 'excellent': return 'performance-excellent'
    case 'good': return 'performance-good'
    default: return 'performance-poor'
  }
}