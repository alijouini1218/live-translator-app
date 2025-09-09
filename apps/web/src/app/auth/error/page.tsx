import { Button } from '@live-translator/ui'
import Link from 'next/link'

interface AuthErrorPageProps {
  searchParams: {
    error?: string
    error_description?: string
  }
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { error, error_description } = searchParams

  const getErrorMessage = () => {
    switch (error) {
      case 'server_error':
        return 'Server error occurred during authentication. This may be due to misconfigured environment variables.'
      case 'invalid_request':
        return 'Invalid authentication request. The magic link may be expired or malformed.'
      case 'access_denied':
        return 'Access denied. Please try signing in again.'
      case 'configuration_error':
        return 'Authentication is not properly configured. Please contact support.'
      default:
        if (error_description) {
          return error_description
        }
        return 'Something went wrong with the authentication process. This usually indicates missing Supabase configuration.'
    }
  }

  const getTroubleshootingSteps = () => {
    return [
      'Check that you clicked the most recent magic link from your email',
      'Verify your email provider didn\'t block the authentication email',
      'Try clearing your browser cache and cookies',
      'Contact support if the problem persists'
    ]
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage()}
          </p>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-xs text-red-800">
                <strong>Error:</strong> {error}
                {error_description && (
                  <>
                    <br />
                    <strong>Details:</strong> {error_description}
                  </>
                )}
              </p>
            </div>
          )}
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Troubleshooting Steps:</h3>
          <ol className="text-xs text-blue-700 space-y-1">
            {getTroubleshootingSteps().map((step, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
        
        <div className="flex flex-col space-y-3">
          <Button asChild>
            <Link href="/auth">Try Again</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}