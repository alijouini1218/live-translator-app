import { GET } from '@/app/auth/callback/route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient } from '../utils/mocks'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('/auth/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should exchange code for session and redirect to app', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/auth/callback?code=auth_code_123')
      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/app')

      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth_code_123')
    })

    it('should redirect to app when no code is provided', async () => {
      const request = new NextRequest('http://localhost:3000/auth/callback')
      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/app')
      expect(mockSupabaseClient.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    })

    it('should redirect to error page when code exchange fails', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockRejectedValue(
        new Error('Invalid code')
      )

      const request = new NextRequest('http://localhost:3000/auth/callback?code=invalid_code')
      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/auth/error')

      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('invalid_code')
    })

    it('should handle different origins correctly', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      })

      const request = new NextRequest('https://myapp.com/auth/callback?code=auth_code_123')
      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('https://myapp.com/app')
    })

    it('should handle code exchange with error response', async () => {
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Code has expired' },
      })

      const request = new NextRequest('http://localhost:3000/auth/callback?code=expired_code')
      const response = await GET(request)

      // Should still redirect to app even with error response (non-exception case)
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/app')
    })

    it('should handle empty code parameter', async () => {
      const request = new NextRequest('http://localhost:3000/auth/callback?code=')
      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/app')
      expect(mockSupabaseClient.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    })
  })

  describe('Security', () => {
    it('should handle malformed URLs', async () => {
      const request = new NextRequest('http://localhost:3000/auth/callback?code=auth_code_123&malicious=param')
      
      mockSupabaseClient.auth.exchangeCodeForSession.mockResolvedValue({
        data: { session: { access_token: 'token' } },
        error: null,
      })

      const response = await GET(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost:3000/app')
      
      // Should only use the code parameter
      expect(mockSupabaseClient.auth.exchangeCodeForSession).toHaveBeenCalledWith('auth_code_123')
    })
  })
})