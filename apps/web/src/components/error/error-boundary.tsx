'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@live-translator/ui/components/button'

export interface ErrorDetails {
  error: Error
  errorInfo: ErrorInfo
  timestamp: Date
  userAgent: string
  url: string
}

interface ErrorBoundaryState {
  hasError: boolean
  errorDetails?: ErrorDetails
  retryCount: number
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (errorDetails: ErrorDetails) => void
  maxRetries?: number
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      timestamp: new Date(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    this.setState({ errorDetails })

    // Call error callback if provided
    if (this.props.onError) {
      this.props.onError(errorDetails)
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    const maxRetries = this.props.maxRetries ?? 3
    if (this.state.retryCount < maxRetries) {
      this.setState({
        hasError: false,
        errorDetails: undefined,
        retryCount: this.state.retryCount + 1
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      errorDetails: undefined,
      retryCount: 0
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.errorDetails?.error}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          retryCount={this.state.retryCount}
          maxRetries={this.props.maxRetries ?? 3}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error?: Error
  onRetry: () => void
  onReset: () => void
  retryCount: number
  maxRetries: number
}

function ErrorFallback({ error, onRetry, onReset, retryCount, maxRetries }: ErrorFallbackProps) {
  const canRetry = retryCount < maxRetries

  const getErrorMessage = () => {
    if (!error) return 'An unexpected error occurred'
    
    // Common error types with user-friendly messages
    if (error.name === 'ChunkLoadError') {
      return 'Failed to load application resources. This usually happens when the app updates.'
    }
    
    if (error.message.includes('Network Error')) {
      return 'Network connection error. Please check your internet connection.'
    }
    
    if (error.message.includes('Permission denied')) {
      return 'Permission denied. Please check your browser settings and try again.'
    }
    
    return error.message || 'Something went wrong'
  }

  const getSuggestions = () => {
    if (!error) return []

    const suggestions = []

    if (error.name === 'ChunkLoadError') {
      suggestions.push('Refresh the page to load the latest version')
      suggestions.push('Clear your browser cache and cookies')
    } else if (error.message.includes('Network Error')) {
      suggestions.push('Check your internet connection')
      suggestions.push('Try switching to a different network')
      suggestions.push('Disable any VPN or proxy if enabled')
    } else if (error.message.includes('Permission denied')) {
      suggestions.push('Allow microphone access in browser settings')
      suggestions.push('Check if another application is using your microphone')
      suggestions.push('Try using a different browser')
    } else {
      suggestions.push('Try refreshing the page')
      suggestions.push('Check if the issue persists in an incognito window')
      suggestions.push('Contact support if the problem continues')
    }

    return suggestions
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center">
        {/* Error icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          Oops! Something went wrong
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {getErrorMessage()}
        </p>

        {/* Suggestions */}
        <div className="text-left mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Try these solutions:</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            {getSuggestions().map((suggestion, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {canRetry && (
            <Button onClick={onRetry} variant="default">
              Try Again {retryCount > 0 && `(${retryCount}/${maxRetries})`}
            </Button>
          )}
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Refresh Page
          </Button>
        </div>

        {!canRetry && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Maximum retry attempts reached. Please refresh the page or contact support.
            </p>
          </div>
        )}

        {/* Error details in development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mt-6 text-left">
            <summary className="text-sm font-medium cursor-pointer text-muted-foreground hover:text-foreground">
              Developer Details
            </summary>
            <div className="mt-3 p-3 bg-muted rounded text-xs font-mono overflow-auto max-h-32">
              <div><strong>Error:</strong> {error.name}</div>
              <div><strong>Message:</strong> {error.message}</div>
              <div><strong>Stack:</strong></div>
              <pre className="whitespace-pre-wrap text-xs">{error.stack}</pre>
            </div>
          </details>
        )}
      </div>
    </div>
  )
}