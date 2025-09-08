import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Database } from '@/lib/supabase/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient<Database>({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // If user is not signed in and is trying to access protected routes
  if (!session && req.nextUrl.pathname.startsWith('/app')) {
    const redirectUrl = new URL('/auth', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is signed in and is trying to access auth pages
  if (session && (
    req.nextUrl.pathname.startsWith('/auth') &&
    !req.nextUrl.pathname.startsWith('/auth/callback')
  )) {
    const redirectUrl = new URL('/app', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/app/:path*', '/auth/:path*']
}