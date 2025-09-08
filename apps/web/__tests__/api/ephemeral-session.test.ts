import { GET } from '@/app/api/ephemeral-session/route'
import { NextRequest } from 'next/server'
import { mockOpenAIClient, mockSupabaseClient } from '../utils/mocks'

// Mock dependencies
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn(() => mockOpenAIClient),
}))

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabaseClient,
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
}))

jest.mock('@live-translator/core', () => ({
  generateRealtimeSystemPrompt: jest.fn(() => 'Mock system prompt for translation'),
}))

describe('/api/ephemeral-session', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Setup default authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    })
  })

  describe('GET', () => {
    it('should create ephemeral session for authenticated user', async () => {
      const request = new NextRequest('http://localhost:3000/api/ephemeral-session?source_lang=en&target_lang=es')
      
      mockOpenAIClient.realtime.sessions.create.mockResolvedValue({
        id: 'session-123',
        client_secret: { value: 'secret-123' },
        expires_at: Date.now() + 3600000,
        voice: 'alloy',
        turn_detection: { type: 'server_vad' },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        session_id: 'session-123',
        client_secret: { value: 'secret-123' },
        expires_at: expect.any(Number),
        voice: 'alloy',
        turn_detection: { type: 'server_vad' },
      })

      expect(mockOpenAIClient.realtime.sessions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-realtime-preview',
        voice: 'alloy',
        instructions: 'Mock system prompt for translation',
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        temperature: 0.3,
        max_response_output_tokens: 4096,
      })
    })

    it('should use default parameters when none provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/ephemeral-session')
      
      mockOpenAIClient.realtime.sessions.create.mockResolvedValue({
        id: 'session-123',
        client_secret: { value: 'secret-123' },
        expires_at: Date.now() + 3600000,
        voice: 'alloy',
        turn_detection: { type: 'server_vad' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      // Should use default parameters
      const createCall = mockOpenAIClient.realtime.sessions.create.mock.calls[0][0]
      expect(createCall.instructions).toBe('Mock system prompt for translation')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/ephemeral-session')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle OpenAI API errors', async () => {
      const request = new NextRequest('http://localhost:3000/api/ephemeral-session')
      
      mockOpenAIClient.realtime.sessions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create session')
      expect(data.message).toBe('OpenAI API rate limit exceeded')
    })

    it('should handle different language parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/ephemeral-session?source_lang=fr&target_lang=de&context=BUSINESS')
      
      mockOpenAIClient.realtime.sessions.create.mockResolvedValue({
        id: 'session-123',
        client_secret: { value: 'secret-123' },
        expires_at: Date.now() + 3600000,
        voice: 'alloy',
        turn_detection: { type: 'server_vad' },
      })

      const response = await GET(request)
      expect(response.status).toBe(200)

      expect(mockOpenAIClient.realtime.sessions.create).toHaveBeenCalled()
    })

    it('should handle Supabase auth errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/ephemeral-session')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create session')
      expect(data.message).toBe('Database connection failed')
    })
  })

  describe('Performance Requirements', () => {
    it('should respond within acceptable latency', async () => {
      const startTime = performance.now()
      
      const request = new NextRequest('http://localhost:3000/api/ephemeral-session?source_lang=en&target_lang=es')
      
      mockOpenAIClient.realtime.sessions.create.mockResolvedValue({
        id: 'session-123',
        client_secret: { value: 'secret-123' },
        expires_at: Date.now() + 3600000,
        voice: 'alloy',
        turn_detection: { type: 'server_vad' },
      })

      const response = await GET(request)
      const endTime = performance.now()
      
      expect(response.status).toBe(200)
      // Should complete within 2 seconds in test environment
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })
})