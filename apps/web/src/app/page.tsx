import { Button } from "@live-translator/ui"
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Force dynamic rendering to avoid build-time Supabase client issues
export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-6xl font-bold mb-6">Live Translator</h1>
          <p className="text-xl text-gray-600 mb-8">
            Real-time voice translation with WebRTC
          </p>
          <div className="space-x-4">
            {user ? (
              <Button variant="default" size="lg" asChild>
                <Link href="/app">Go to App</Link>
              </Button>
            ) : (
              <Button variant="default" size="lg" asChild>
                <Link href="/auth">Get Started</Link>
              </Button>
            )}
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
          {!user && (
            <p className="mt-4 text-sm text-gray-500">
              No account needed to get started
            </p>
          )}
        </div>
      </div>
    </main>
  )
}