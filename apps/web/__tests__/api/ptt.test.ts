import { POST, OPTIONS } from '@/app/api/ptt/route'
import { NextRequest } from 'next/server'
import { mockOpenAIClient } from '../utils/mocks'

// Mock dependencies
global.fetch = jest.fn()

jest.mock('openai', () => ({
  OpenAI: jest.fn(() => mockOpenAIClient),
}))

describe('/api/ptt', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment variables
    process.env.OPENAI_API_KEY = 'test_openai_key'
    process.env.ELEVENLABS_API_KEY = 'test_elevenlabs_key'
    process.env.ELEVENLABS_DEFAULT_VOICE_ID = 'test_voice_id'
    process.env.ELEVENLABS_MODEL_ID = 'eleven_turbo_v2_5'
    process.env.OPENAI_STT_MODEL = 'whisper-1'
  })

  describe('POST', () => {
    const mockAudioBase64 = Buffer.from('mock audio data').toString('base64')

    it('should process complete PTT pipeline successfully', async () => {
      // Mock successful OpenAI transcription
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')

      // Mock successful OpenAI translation
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'Hola, ¿cómo estás?',
          },
        }],
      })

      // Mock successful ElevenLabs TTS
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

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          audioFormat: 'mp3',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('audio/mp3')
      
      // Check latency headers
      expect(response.headers.get('X-STT-Latency')).toBeDefined()
      expect(response.headers.get('X-Translation-Latency')).toBeDefined()
      expect(response.headers.get('X-TTS-Latency')).toBeDefined()
      expect(response.headers.get('X-Total-Latency')).toBeDefined()
      
      // Check text headers (base64 encoded)
      expect(response.headers.get('X-Source-Text')).toBeDefined()
      expect(response.headers.get('X-Target-Text')).toBeDefined()

      // Verify OpenAI STT call
      expect(mockOpenAIClient.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text',
        temperature: 0.2,
      })

      // Verify OpenAI translation call
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'user', 
            content: expect.stringContaining('English text to Spanish')
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
      })

      // Verify ElevenLabs TTS call
      expect(fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/test_voice_id/stream?optimize_streaming_latency=4&output_format=mp3',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': 'test_elevenlabs_key',
          },
          body: JSON.stringify({
            model_id: 'eleven_turbo_v2_5',
            text: 'Hola, ¿cómo estás?',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              use_speaker_boost: true,
            },
          }),
        }
      )
    })

    it('should handle auto language detection', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hola, ¿cómo estás?' } }],
      })

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

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'auto',
          targetLanguage: 'es',
        }),
      })

      await POST(request)

      // Should not pass language parameter to Whisper for auto-detection
      expect(mockOpenAIClient.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: undefined, // Auto-detection
        response_format: 'text',
        temperature: 0.2,
      })
    })

    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          // Missing sourceLanguage and targetLanguage
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Audio data, source language, and target language are required')
    })

    it('should return 503 when OpenAI API key is not configured', async () => {
      delete process.env.OPENAI_API_KEY

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('STT service not configured')
    })

    it('should return 503 when ElevenLabs API key is not configured', async () => {
      delete process.env.ELEVENLABS_API_KEY

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toBe('TTS service not configured')
    })

    it('should handle empty transcription', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('')

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No speech detected in audio')
    })

    it('should handle translation failure', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      
      // Mock translation with empty response
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Translation failed')
    })

    it('should handle ElevenLabs API errors', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hola, ¿cómo estás?' } }],
      })

      // Mock ElevenLabs API error
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limit exceeded'),
      })

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('TTS generation failed')
    })

    it('should handle OpenAI STT errors', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.details).toBe('OpenAI API rate limit exceeded')
    })

    it('should handle OpenAI translation errors', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockRejectedValue(
        new Error('Invalid API key')
      )

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Invalid API key')
    })

    it('should handle audio format errors', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockRejectedValue(
        new Error('Invalid audio format')
      )

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: 'invalid-base64',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid audio format')
    })

    it('should use custom voice and model parameters', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hola, ¿cómo estás?' } }],
      })

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

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
          voiceId: 'custom_voice_id',
          modelId: 'custom_model_id',
        }),
      })

      await POST(request)

      expect(fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/custom_voice_id/stream?optimize_streaming_latency=4&output_format=mp3',
        expect.objectContaining({
          body: JSON.stringify({
            model_id: 'custom_model_id',
            text: 'Hola, ¿cómo estás?',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
              use_speaker_boost: true,
            },
          }),
        })
      )
    })

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
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
    it('should complete PTT pipeline within acceptable latency', async () => {
      // Mock fast responses
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hola, ¿cómo estás?' } }],
      })

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

      const startTime = performance.now()

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const response = await POST(request)
      const endTime = performance.now()

      expect(response.status).toBe(200)
      
      // Should complete within 5 seconds in test environment
      expect(endTime - startTime).toBeLessThan(5000)

      // Check that latency headers are reasonable (mock environment)
      const totalLatency = parseInt(response.headers.get('X-Total-Latency') || '0')
      expect(totalLatency).toBeGreaterThan(0)
      expect(totalLatency).toBeLessThan(5000)
    })

    it('should use optimized settings for low latency', async () => {
      mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Hello, how are you?')
      mockOpenAIClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Hola, ¿cómo estás?' } }],
      })

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

      const request = new NextRequest('http://localhost:3000/api/ptt', {
        method: 'POST',
        body: JSON.stringify({
          audio: mockAudioBase64,
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      await POST(request)

      // Verify optimal settings for PTT
      expect(mockOpenAIClient.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.2, // Low temperature for consistency
        })
      )

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3, // Low temperature for consistency
        })
      )

      // Verify maximum latency optimization for ElevenLabs
      const fetchCall = (fetch as jest.Mock).mock.calls[0]
      const url = fetchCall[0]
      expect(url).toContain('optimize_streaming_latency=4')
    })
  })

  describe('Language Support', () => {
    it('should support various language pairs', async () => {
      const testCases = [
        { source: 'en', target: 'es', expectedSourceName: 'English', expectedTargetName: 'Spanish' },
        { source: 'fr', target: 'de', expectedSourceName: 'French', expectedTargetName: 'German' },
        { source: 'ja', target: 'en', expectedSourceName: 'Japanese', expectedTargetName: 'English' },
        { source: 'auto', target: 'zh', expectedSourceName: 'Auto-detected', expectedTargetName: 'Chinese' },
      ]

      for (const testCase of testCases) {
        mockOpenAIClient.audio.transcriptions.create.mockResolvedValue('Test text')
        mockOpenAIClient.chat.completions.create.mockResolvedValue({
          choices: [{ message: { content: 'Translated text' } }],
        })

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

        const request = new NextRequest('http://localhost:3000/api/ptt', {
          method: 'POST',
          body: JSON.stringify({
            audio: mockAudioBase64,
            sourceLanguage: testCase.source,
            targetLanguage: testCase.target,
          }),
        })

        await POST(request)

        // Verify translation prompt contains correct language names
        const translationCall = mockOpenAIClient.chat.completions.create.mock.calls.slice(-1)[0][0]
        expect(translationCall.messages[0].content).toContain(testCase.expectedSourceName)
        expect(translationCall.messages[0].content).toContain(testCase.expectedTargetName)

        jest.clearAllMocks()
      }
    })
  })
})