'use client'

import { useState } from 'react'
import { Button } from '@live-translator/ui'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthButtonProps {
  variant?: 'signin' | 'signup'
}

export function AuthButton({ variant = 'signin' }: AuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error('Auth error:', error.message)
        alert('Error: ' + error.message)
      } else {
        alert('Check your email for the login link!')
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleAuth} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          placeholder="Enter your email"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !email}
        className="w-full"
      >
        {isLoading ? 'Sending...' : variant === 'signin' ? 'Sign In' : 'Sign Up'}
      </Button>
    </form>
  )
}