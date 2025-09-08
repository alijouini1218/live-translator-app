import { POST, OPTIONS } from '@/app/api/tts/route'
import { NextRequest } from 'next/server'

// Mock fetch globally
global.fetch = jest.fn()

describe('/api/tts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment variables
    process.env.ELEVENLABS_API_KEY = 'test_api_key'
    process.env.ELEVENLABS_DEFAULT_VOICE_ID = 'test_voice_id'
    process.env.ELEVENLABS_MODEL_ID = 'eleven_turbo_v2_5'
  })

  describe('POST', () => {
    it('should generate TTS audio successfully', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          voiceId: 'custom_voice_id',
          modelId: 'eleven_turbo_v2_5',
          outputFormat: 'mp3',
        }),
      })

      const response = await POST(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('audio/mp3')
      expect(response.headers.get('Cache-Control')).toBe('no-store')

      expect(fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/custom_voice_id/stream?optimize_streaming_latency=2&output_format=mp3',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': 'test_api_key',
          },
          body: JSON.stringify({
            model_id: 'eleven_turbo_v2_5',
            text: 'Hello, world!',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      )
    })

    it('should use default parameters when not provided', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      await POST(request)

      expect(fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/test_voice_id/stream?optimize_streaming_latency=2&output_format=mp3',
        expect.objectContaining({
          body: JSON.stringify({
            model_id: 'eleven_turbo_v2_5',
            text: 'Hello, world!',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })
      )
    })

    it('should return 400 for empty text', async () => {
      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Text is required')
    })

    it('should return 400 for whitespace-only text', async () => {
      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: '   ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Text is required')
    })

    it('should return 503 when API key is not configured', async () => {
      delete process.env.ELEVENLABS_API_KEY

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('TTS service not configured')
    })

    it('should handle ElevenLabs API 401 error', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Invalid API key'),
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid API key')
    })

    it('should handle ElevenLabs API 429 rate limit error', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
    })

    it('should handle other ElevenLabs API errors', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal server error'),
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('TTS generation failed')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should trim text input', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: '  Hello, world!  ',
        }),
      })

      await POST(request)

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            model_id: 'eleven_turbo_v2_5',
            text: 'Hello, world!', // Should be trimmed
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        })
      )
    })

    it('should use custom optimize_streaming_latency parameter', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          optimize_streaming_latency: 4,
        }),
      })

      await POST(request)

      expect(fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/test_voice_id/stream?optimize_streaming_latency=4&output_format=mp3',
        expect.any(Object)
      )
    })
  })

  describe('OPTIONS', () => {
    it('should handle CORS preflight request', async () => {
      const response = await OPTIONS()

      expect(response.status).toBe(200)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS')
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })
  })

  describe('Performance Requirements', () => {
    it('should handle streaming response efficiently', async () => {
      // Mock a larger audio stream to test streaming
      const chunks = [
        new Uint8Array(1024),
        new Uint8Array(2048),
        new Uint8Array(1024),
      ]

      const mockAudioStream = new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => controller.enqueue(chunk))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'This is a longer text to test streaming performance',
        }),
      })

      const startTime = performance.now()
      const response = await POST(request)
      const endTime = performance.now()

      expect(response.status).toBe(200)
      expect(response.body).toBeDefined()
      // Response should be fast (under 100ms for mock)
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should optimize for low latency with correct parameters', async () => {
      const mockAudioStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        body: mockAudioStream,
      })

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello, world!',
          optimize_streaming_latency: 4, // High optimization
        }),
      })

      await POST(request)

      const fetchCall = (fetch as jest.Mock).mock.calls[0]
      const url = fetchCall[0]
      
      expect(url).toContain('optimize_streaming_latency=4')
      expect(url).toContain('output_format=mp3') // MP3 is faster than WAV for streaming
    })
  })
})