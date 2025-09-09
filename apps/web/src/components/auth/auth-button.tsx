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
    
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Supabase not configured')
      alert('Authentication is not configured. Please check environment variables.')
      setIsLoading(false)
      return
    }

    console.log('Attempting authentication for:', email)
    console.log('Redirect URL:', `${window.location.origin}/auth/callback`)

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('Auth response:', { data, error })

      if (error) {
        console.error('Auth error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        })
        
        let userMessage = 'Error: ' + error.message
        
        if (error.message.includes('Invalid login credentials')) {
          userMessage = 'Authentication failed. Please check if email authentication is enabled in your Supabase project.'
        } else if (error.message.includes('Email not confirmed')) {
          userMessage = 'Please check your email and click the confirmation link first.'
        } else if (error.message.includes('signups not allowed')) {
          userMessage = 'New signups are disabled. Please contact support.'
        }
        
        alert(userMessage)
      } else {
        console.log('Magic link sent successfully')
        alert('Check your email for the login link! It may take a few minutes to arrive.')
      }
    } catch (error: any) {
      console.error('Unexpected authentication error:', {
        message: error?.message || 'Unknown error',
        name: error?.name,
        stack: error?.stack
      })
      
      let userMessage = 'An unexpected error occurred'
      if (error?.message?.includes('Failed to fetch')) {
        userMessage = 'Network error. Please check your internet connection and try again.'
      } else if (error?.message?.includes('Invalid URL')) {
        userMessage = 'Configuration error. Please check Supabase URL setup.'
      }
      
      alert(userMessage)
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