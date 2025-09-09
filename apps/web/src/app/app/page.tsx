import { Button } from '@live-translator/ui'
import { createClient } from '@/lib/supabase/server'
import { EnhancedLiveTranslator } from '@/components/translator/enhanced-live-translator'
import Link from 'next/link'

// Force dynamic rendering to avoid build-time Supabase client issues
export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id || '')
    .single()

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground">
          Welcome to Live Translator
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Real-time voice-to-voice translation with advanced features
        </p>
        {(profile as any)?.plan === 'free' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You're on the free plan (10 minutes/day). 
              <Link href="/app/billing" className="font-medium underline ml-1">
                Upgrade to Pro
              </Link> for unlimited usage.
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Live Translation Interface with M7 features */}
      <EnhancedLiveTranslator />

      {/* Feature Overview - Updated for M7 */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">M7 Features - Production Ready</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-foreground">Privacy & Consent</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              GDPR-compliant consent management with clear privacy controls and mic permission handling.
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-foreground">Performance Analytics</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time latency monitoring, connection quality indicators, and detailed session metrics.
            </p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" />
              </svg>
              <h4 className="font-medium text-foreground">Keyboard Shortcuts</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Full keyboard navigation with spacebar PTT, escape to stop, and ? for help overlay.
            </p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Press ? for keyboard shortcuts</strong> or <strong>H for help panel</strong> to get started with the enhanced features.
          </p>
        </div>
      </div>
    </div>
  )
}