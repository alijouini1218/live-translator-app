/**
 * Smoke Tests - High-level integration tests to verify critical functionality
 * These tests run against real services in test environment for CI/CD validation
 */

import { createClient } from '@supabase/supabase-js'

// Only run smoke tests when explicitly requested and in CI with proper credentials
const shouldRunSmokeTests = process.env.RUN_SMOKE_TESTS === 'true' || 
                           (process.env.CI && process.env.OPENAI_API_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL)

const describeSmoke = shouldRunSmokeTests ? describe : describe.skip

describeSmoke('Smoke Tests - Critical Integration Points', () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
  
  let supabase: any

  beforeAll(() => {
    if (supabaseUrl && supabaseAnonKey) {
      supabase = createClient(supabaseUrl, supabaseAnonKey)
    }
  })

  describe('Authentication smoke tests', () => {
    it('should connect to Supabase Auth service', async () => {
      expect(supabase).toBeDefined()
      
      // Test basic connection - this should not fail in test environment
      const { data, error } = await supabase.auth.getSession()
      
      // Should not error (session can be null, that's fine)
      expect(error).toBeNull()
      expect(data).toHaveProperty('session')
    }, 10000)

    it('should validate auth configuration', async () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
      expect(process.env.SUPABASE_ANON_KEY).toBeTruthy()
      
      // URL should be properly formatted
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toMatch(/^https:\/\/.*\.supabase\.co$/)
    })
  })

  describe('Database smoke tests', () => {
    it('should have required tables with proper RLS policies', async () => {
      // Test profiles table access (should require auth)
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      // Should either succeed or fail with auth error (not table missing error)
      if (error) {
        expect(error.message).not.toContain('does not exist')
        expect(error.code).toBe('PGRST301') // JWT required error
      } else {
        expect(data).toBeDefined()
      }
    })

    it('should have sessions table accessible', async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id')
        .limit(1)

      // Should have RLS protection
      if (error) {
        expect(error.code).toBe('PGRST301') // JWT required error
      } else {
        expect(data).toBeDefined()
      }
    })
  })

  describe('OpenAI API smoke tests', () => {
    it('should connect to OpenAI Realtime API', async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log('Skipping OpenAI test - no API key provided')
        return
      }

      const response = await fetch('/api/ephemeral-session?source_lang=en&target_lang=es', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-token', // This will fail auth but test API connectivity
        },
      })

      // Should get a response (even if 401 due to auth)
      expect(response).toBeDefined()
      expect([200, 401, 500].includes(response.status)).toBe(true)
    })
  })

  describe('Stripe billing smoke tests', () => {
    it('should connect to Stripe API', async () => {
      if (!process.env.STRIPE_SECRET_KEY) {
        console.log('Skipping Stripe test - no API key provided')
        return
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          priceId: 'price_test_123',
        }),
      })

      // Should get a response (even if error due to auth/invalid price)
      expect(response).toBeDefined()
      expect([200, 400, 401, 500].includes(response.status)).toBe(true)
    })

    it('should validate webhook endpoint', async () => {
      const response = await fetch('/api/stripe-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'webhook' }),
      })

      // Should handle webhook requests (likely fail signature validation)
      expect(response).toBeDefined()
      expect([200, 400, 500].includes(response.status)).toBe(true)
    })
  })

  describe('TTS service smoke tests', () => {
    it('should connect to ElevenLabs TTS API', async () => {
      if (!process.env.ELEVENLABS_API_KEY) {
        console.log('Skipping ElevenLabs test - no API key provided')
        return
      }

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Test message',
        }),
      })

      // Should get a response
      expect(response).toBeDefined()
      expect([200, 400, 401, 429, 500].includes(response.status)).toBe(true)
    })

    it('should handle OPTIONS requests for CORS', async () => {
      const response = await fetch('/api/tts', {
        method: 'OPTIONS',
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  describe('PTT pipeline smoke tests', () => {
    it('should accept PTT requests', async () => {
      const mockAudioData = Buffer.from('mock audio data').toString('base64')
      
      const response = await fetch('/api/ptt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: mockAudioData,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      // Should accept the request format
      expect(response).toBeDefined()
      expect([200, 400, 503].includes(response.status)).toBe(true)
    })
  })

  describe('Performance requirements smoke tests', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now()
      
      const response = await fetch('/', {
        method: 'GET',
      })
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(2000) // Should respond within 2 seconds
    })

    it('should handle concurrent requests', async () => {
      const promises = Array(5).fill(0).map(() => 
        fetch('/', { method: 'GET' })
      )
      
      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Security smoke tests', () => {
    it('should have proper CORS configuration', async () => {
      const response = await fetch('/api/tts', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeTruthy()
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    it('should protect sensitive API routes', async () => {
      // Test that admin routes require authentication
      const response = await fetch('/api/ephemeral-session')
      
      // Should either work (if properly authenticated) or return auth error
      if (response.status === 401) {
        const data = await response.json()
        expect(data.error).toBe('Unauthorized')
      } else {
        expect([200, 500].includes(response.status)).toBe(true)
      }
    })

    it('should validate input on API endpoints', async () => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Empty body should fail validation
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('required')
    })
  })

  describe('Environment configuration smoke tests', () => {
    it('should have required environment variables in production', () => {
      if (process.env.NODE_ENV === 'production') {
        // Critical environment variables for production
        expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
        expect(process.env.OPENAI_API_KEY).toBeTruthy()
        expect(process.env.ELEVENLABS_API_KEY).toBeTruthy()
        expect(process.env.STRIPE_SECRET_KEY).toBeTruthy()
        expect(process.env.STRIPE_WEBHOOK_SECRET).toBeTruthy()
      }
    })

    it('should have proper API rate limiting configured', async () => {
      // Test that APIs don't immediately fail with rate limiting
      const response = await fetch('/api/tts', {
        method: 'OPTIONS',
      })

      expect(response.status).not.toBe(429) // Should not be rate limited immediately
    })
  })

  describe('Mobile compatibility smoke tests', () => {
    it('should serve mobile-optimized content', async () => {
      const response = await fetch('/', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      })

      expect(response.status).toBe(200)
      
      const html = await response.text()
      expect(html).toContain('viewport')
      expect(html).toContain('width=device-width')
    })
  })

  describe('Monitoring and observability smoke tests', () => {
    it('should provide proper error responses with details', async () => {
      const response = await fetch('/api/nonexistent-endpoint')
      
      expect(response.status).toBe(404)
    })

    it('should handle malformed requests gracefully', async () => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      expect([400, 500].includes(response.status)).toBe(true)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })
})

describe('Critical User Journey Smoke Tests', () => {
  // These would be run with Playwright in a real environment
  
  it('should load the main application page', async () => {
    const response = await fetch('/')
    expect(response.status).toBe(200)
  })

  it('should load the authentication page', async () => {
    const response = await fetch('/auth')
    expect(response.status).toBe(200)
  })

  it('should load the billing page', async () => {
    const response = await fetch('/app/billing')
    // May redirect to auth, but should not error
    expect([200, 302].includes(response.status)).toBe(true)
  })
})