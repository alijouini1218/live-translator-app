import { renderHook, act } from '@testing-library/react'
import { useRealtimeTranslation } from '@/hooks/use-realtime-translation'
import { createMockRTCPeerConnection, createMockMediaStream } from '../utils/test-helpers'

// Mock dependencies
global.fetch = jest.fn()
global.RTCPeerConnection = jest.fn()
global.navigator.mediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn(),
} as any

describe('useRealtimeTranslation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.RTCPeerConnection as jest.Mock).mockImplementation(createMockRTCPeerConnection)
    ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(createMockMediaStream())
  })

  describe('Hook initialization', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.latency).toBeNull()
      expect(result.current.transcription).toBe('')
      expect(result.current.translation).toBe('')
    })
  })

  describe('Connection management', () => {
    it('should establish WebRTC connection successfully', async () => {
      // Mock successful ephemeral session creation
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.isConnecting).toBe(false)
      expect(result.current.isConnected).toBe(true)
      expect(result.current.error).toBeNull()

      // Verify ephemeral session API call
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/ephemeral-session?source_lang=en&target_lang=es',
        { method: 'GET' }
      )

      // Verify WebRTC connection setup
      expect(global.RTCPeerConnection).toHaveBeenCalled()
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: true,
      })
    })

    it('should handle connection failures gracefully', async () => {
      // Mock API failure
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        try {
          await result.current.connect()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.error).toBe('Failed to create realtime session')
    })

    it('should handle microphone permission denial', async () => {
      // Mock successful API but failed getUserMedia
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValueOnce(
        new Error('Permission denied')
      )

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        try {
          await result.current.connect()
        } catch (error) {
          // Expected to throw
        }
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('Microphone permission required')
    })

    it('should disconnect properly', async () => {
      // Setup successful connection first
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.isConnected).toBe(true)

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.transcription).toBe('')
      expect(result.current.translation).toBe('')
    })
  })

  describe('Real-time transcription', () => {
    it('should handle incoming transcription updates', async () => {
      const mockDataChannel = {
        label: 'transcription',
        readyState: 'open',
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }

      const mockPeerConnection = createMockRTCPeerConnection()
      mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      // Simulate receiving transcription data
      act(() => {
        if (mockDataChannel.onmessage) {
          mockDataChannel.onmessage({
            data: JSON.stringify({
              type: 'transcription',
              text: 'Hello, how are you?',
              is_final: false,
            }),
          } as MessageEvent)
        }
      })

      expect(result.current.transcription).toBe('Hello, how are you?')
    })

    it('should handle incoming translation updates', async () => {
      const mockDataChannel = {
        label: 'transcription',
        readyState: 'open',
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }

      const mockPeerConnection = createMockRTCPeerConnection()
      mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      // Simulate receiving translation data
      act(() => {
        if (mockDataChannel.onmessage) {
          mockDataChannel.onmessage({
            data: JSON.stringify({
              type: 'translation',
              text: 'Hola, ¿cómo estás?',
              is_final: true,
            }),
          } as MessageEvent)
        }
      })

      expect(result.current.translation).toBe('Hola, ¿cómo estás?')
    })
  })

  describe('Latency measurement', () => {
    it('should measure and report latency', async () => {
      const mockDataChannel = {
        label: 'transcription',
        readyState: 'open',
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }

      const mockPeerConnection = createMockRTCPeerConnection()
      mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      const startTime = performance.now()

      // Simulate receiving final translation with timing
      act(() => {
        if (mockDataChannel.onmessage) {
          mockDataChannel.onmessage({
            data: JSON.stringify({
              type: 'translation',
              text: 'Hola, ¿cómo estás?',
              is_final: true,
              timestamp: startTime,
            }),
          } as MessageEvent)
        }
      })

      expect(result.current.latency).toBeGreaterThan(0)
      expect(result.current.latency).toBeLessThan(1000) // Should be under 1 second in tests
    })
  })

  describe('Error handling', () => {
    it('should handle WebRTC connection errors', async () => {
      const mockPeerConnection = createMockRTCPeerConnection()
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      // Simulate connection error
      act(() => {
        if (mockPeerConnection.onconnectionstatechange) {
          mockPeerConnection.connectionState = 'failed'
          mockPeerConnection.onconnectionstatechange()
        }
      })

      expect(result.current.isConnected).toBe(false)
      expect(result.current.error).toBe('WebRTC connection failed')
    })

    it('should handle data channel errors', async () => {
      const mockDataChannel = {
        label: 'transcription',
        readyState: 'open',
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }

      const mockPeerConnection = createMockRTCPeerConnection()
      mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      // Simulate data channel error
      act(() => {
        if (mockDataChannel.onerror) {
          mockDataChannel.onerror(new Event('error'))
        }
      })

      expect(result.current.error).toBe('Data channel error')
    })
  })

  describe('Performance requirements', () => {
    it('should meet latency requirements for translation', async () => {
      const mockDataChannel = {
        label: 'transcription',
        readyState: 'open',
        send: jest.fn(),
        close: jest.fn(),
        onopen: null,
        onmessage: null,
        onerror: null,
        onclose: null,
      }

      const mockPeerConnection = createMockRTCPeerConnection()
      mockPeerConnection.createDataChannel.mockReturnValue(mockDataChannel)
      ;(global.RTCPeerConnection as jest.Mock).mockImplementation(() => mockPeerConnection)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      const connectionStart = performance.now()

      await act(async () => {
        await result.current.connect()
      })

      const connectionEnd = performance.now()
      const connectionLatency = connectionEnd - connectionStart

      // Connection should establish quickly in test environment
      expect(connectionLatency).toBeLessThan(1000)
      expect(result.current.isConnected).toBe(true)

      // Test first translation latency
      const translationStart = performance.now()

      act(() => {
        if (mockDataChannel.onmessage) {
          mockDataChannel.onmessage({
            data: JSON.stringify({
              type: 'translation',
              text: 'Hola, ¿cómo estás?',
              is_final: true,
              timestamp: translationStart,
            }),
          } as MessageEvent)
        }
      })

      // Should meet < 700ms requirement (in real world, not just test mocks)
      expect(result.current.latency).toBeLessThan(700)
    })
  })

  describe('Cleanup', () => {
    it('should clean up resources on unmount', async () => {
      const mockMediaStream = createMockMediaStream()
      ;(navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue(mockMediaStream)

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }),
      })

      const { result, unmount } = renderHook(() => useRealtimeTranslation({
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }))

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.isConnected).toBe(true)

      unmount()

      // Verify cleanup (tracks are stopped, connections closed)
      const audioTracks = mockMediaStream.getAudioTracks()
      audioTracks.forEach(track => {
        expect(track.stop).toHaveBeenCalled()
      })
    })
  })
})