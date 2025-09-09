import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { Database } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  console.log('Auth callback received:', { 
    code: code ? `${code.substring(0, 20)}...` : 'missing',
    next,
    origin,
    userAgent: request.headers.get('user-agent')?.substring(0, 100)
  })

  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase environment variables not configured')
    return NextResponse.redirect(
      `${origin}/auth/error?error=configuration_error&error_description=Missing Supabase configuration`
    )
  }

  if (!code) {
    console.error('No auth code provided in callback')
    return NextResponse.redirect(
      `${origin}/auth/error?error=invalid_request&error_description=No authorization code provided`
    )
  }

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
    console.log('Attempting to exchange code for session...')
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth exchange error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      })
      
      const errorType = error.message.includes('invalid_grant') ? 'invalid_request' : 'server_error'
      return NextResponse.redirect(
        `${origin}/auth/error?error=${errorType}&error_description=${encodeURIComponent(error.message)}`
      )
    }
    
    if (!data?.session) {
      console.error('No session returned from auth exchange')
      return NextResponse.redirect(
        `${origin}/auth/error?error=server_error&error_description=No session created`
      )
    }

    console.log('Authentication successful:', {
      userId: data.session.user.id,
      email: data.session.user.email,
      redirectTo: next,
      expiresAt: new Date(data.session.expires_at! * 1000).toISOString()
    })

    return response
    
  } catch (error: any) {
    console.error('Auth callback unexpected error:', {
      message: error?.message || 'Unknown error',
      name: error?.name,
      stack: error?.stack
    })
    
    return NextResponse.redirect(
      `${origin}/auth/error?error=server_error&error_description=${encodeURIComponent(
        error?.message || 'Unexpected authentication error'
      )}`
    )
  }
}