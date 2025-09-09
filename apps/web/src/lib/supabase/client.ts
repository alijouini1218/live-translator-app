import { createBrowserClient } from '@supabase/ssr'
import { Database } from './database.types'

export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ? 'set' : 'missing',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey ? 'set' : 'missing'
    })
    
    // Return a mock client that will fail gracefully
    return {
      auth: {
        signInWithOtp: async () => ({ 
          error: { message: 'Supabase not configured' } 
        }),
        getUser: async () => ({ 
          data: { user: null }, 
          error: { message: 'Supabase not configured' } 
        }),
        getSession: async () => ({ 
          data: { session: null }, 
          error: { message: 'Supabase not configured' } 
        })
      },
      from: () => ({
        select: () => ({ error: { message: 'Supabase not configured' } })
      })
    } as any
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey) as any
}