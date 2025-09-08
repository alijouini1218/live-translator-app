import { AuthButton } from '@/components/auth/auth-button'
import Link from 'next/link'

export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Live Translator
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We'll send you a magic link to sign in
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <AuthButton variant="signin" />
          <div className="text-center">
            <Link
              href="/"
              className="font-medium text-black hover:text-gray-600"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}