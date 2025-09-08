'use client'

import { useState } from 'react'
import { Button } from '@live-translator/ui/components/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/auth-helpers-nextjs'

interface UserAvatarProps {
  user: User
  profile?: {
    display_name?: string
    plan: string
  }
}

export function UserAvatar({ user, profile }: UserAvatarProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex flex-col items-end">
        <p className="text-sm font-medium text-black">
          {profile?.display_name || user.email?.split('@')[0]}
        </p>
        <p className="text-xs text-gray-500 capitalize">
          {profile?.plan || 'free'} plan
        </p>
      </div>
      <div className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full">
        {(profile?.display_name || user.email)?.[0]?.toUpperCase()}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? 'Signing out...' : 'Sign Out'}
      </Button>
    </div>
  )
}