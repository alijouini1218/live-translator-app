import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppLayoutWrapper } from '@/components/layout/app-layout-wrapper'

// Force dynamic rendering to avoid build-time Supabase client issues
export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <AppLayoutWrapper user={user} profile={profile}>
      {children}
    </AppLayoutWrapper>
  )
}