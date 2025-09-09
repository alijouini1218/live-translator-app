import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    let response = NextResponse.redirect(`${origin}${next}`)
    
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set(name, value, options)
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set(name, '', { ...options, maxAge: 0 })
          },
        },
      }
    )

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error && data?.session) {
        console.log('Authentication successful, redirecting to:', next)
        return response
      } else {
        console.error('Auth exchange error:', error)
        return NextResponse.redirect(`${origin}/auth/error`)
      }
    } catch (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/auth/error`)
    }
  }

  // Handle case where no code is provided
  return NextResponse.redirect(`${origin}/auth/error`)
}