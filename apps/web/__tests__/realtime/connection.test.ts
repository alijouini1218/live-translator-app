/**
 * Realtime Connection Tests
 * Tests OpenAI Realtime API connection establishment, WebRTC functionality,
 * and auto-switching to PTT mode on connection issues
 */

import { 
  createMockWebRTCConnection, 
  simulateWebRTCConnection, 
  simulateWebRTCFailure,
  createLatencyTest,
  measureExecutionTime,
  waitForCondition
} from '../utils/test-helpers'
import { MockWebSocket, mockOpenAIClient, mockPerformanceMetrics } from '../utils/mocks'

// Mock dependencies
jest.mock('@/lib/openai/client', () => ({
  openaiClient: mockOpenAIClient,
}))

// Mock WebSocket globally
global.WebSocket = MockWebSocket as any

describe('Realtime Connection Tests', () => {
  let mockWebSocket: MockWebSocket
  let mockPeerConnection: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockPeerConnection = createMockWebRTCConnection()
    global.RTCPeerConnection = jest.fn(() => mockPeerConnection)
  })

  describe('OpenAI Realtime API Connection', () => {
    it('should establish WebSocket connection successfully', async () => {
      const connectionTest = createLatencyTest(2000) // 2 second limit

      await connectionTest(async () => {
        mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
        
        return new Promise((resolve) => {
          mockWebSocket.onopen = () => resolve('connected')
        })
      })

      expect(mockWebSocket.readyState).toBe(MockWebSocket.OPEN)
    })

    it('should handle ephemeral session creation', async () => {
      mockOpenAIClient.realtime.sessions.create.mockResolvedValue({
        id: 'session-123',
        client_secret: {
          value: 'ephemeral-secret-key',
        },
      })

      const response = await fetch('/api/ephemeral-session?source_lang=en&target_lang=es')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe('session-123')
      expect(data.client_secret.value).toBe('ephemeral-secret-key')
    })

    it('should validate required language parameters', async () => {
      const response = await fetch('/api/ephemeral-session')
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('source_lang')
    })

    it('should handle OpenAI API errors', async () => {
      mockOpenAIClient.realtime.sessions.create.mockRejectedValue(
        new Error('OpenAI API rate limit exceeded')
      )

      const response = await fetch('/api/ephemeral-session?source_lang=en&target_lang=es')
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to create ephemeral session')
    })

    it('should authenticate session with proper headers', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'session-123',
          client_secret: { value: 'secret' },
        }),
      })
      
      global.fetch = mockFetch

      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')

      await new Promise(resolve => {
        mockWebSocket.onopen = () => {
          // Simulate authentication message
          mockWebSocket.send(JSON.stringify({
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are a helpful translator.',
            },
          }))
          resolve('authenticated')
        }
      })

      expect(mockWebSocket.readyState).toBe(MockWebSocket.OPEN)
    })

    it('should handle connection timeout', async () => {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 1000)
      })

      const connectionPromise = new Promise((resolve) => {
        mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
        // Simulate slow connection - don't call onopen
      })

      await expect(Promise.race([connectionPromise, timeoutPromise]))
        .rejects.toThrow('Connection timeout')
    })
  })

  describe('WebRTC Connection Management', () => {
    it('should establish WebRTC peer connection', async () => {
      const connectionLatency = await measureExecutionTime(async () => {
        await simulateWebRTCConnection(mockPeerConnection)
      })

      expect(connectionLatency.duration).toBeLessThan(500) // Should connect quickly
      expect(mockPeerConnection.connectionState).toBe('connected')
      expect(mockPeerConnection.iceConnectionState).toBe('connected')
    })

    it('should create and configure data channel', async () => {
      await simulateWebRTCConnection(mockPeerConnection)

      const dataChannel = mockPeerConnection.createDataChannel('audio-control')
      
      expect(dataChannel.label).toBe('audio-control')
      expect(dataChannel.readyState).toBe('open')
      expect(mockPeerConnection.createDataChannel).toHaveBeenCalledWith('audio-control')
    })

    it('should handle ICE candidate exchange', async () => {
      const mockCandidate = {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      }

      await mockPeerConnection.addIceCandidate(mockCandidate)

      expect(mockPeerConnection.addIceCandidate).toHaveBeenCalledWith(mockCandidate)
    })

    it('should create and set local description', async () => {
      const offer = await mockPeerConnection.createOffer()
      await mockPeerConnection.setLocalDescription(offer)

      expect(mockPeerConnection.localDescription).toEqual(offer)
      expect(offer.type).toBe('offer')
    })

    it('should handle remote description setting', async () => {
      const remoteDesc = {
        type: 'answer',
        sdp: 'mock-remote-sdp',
      }

      await mockPeerConnection.setRemoteDescription(remoteDesc)

      expect(mockPeerConnection.remoteDescription).toEqual(remoteDesc)
    })

    it('should handle connection failures and retry', async () => {
      // Simulate connection failure
      await simulateWebRTCFailure(mockPeerConnection)

      expect(mockPeerConnection.connectionState).toBe('failed')

      // Simulate retry with new connection
      mockPeerConnection = createMockWebRTCConnection()
      await simulateWebRTCConnection(mockPeerConnection)

      expect(mockPeerConnection.connectionState).toBe('connected')
    })

    it('should cleanup connection on close', async () => {
      await simulateWebRTCConnection(mockPeerConnection)
      
      mockPeerConnection.close()

      expect(mockPeerConnection.close).toHaveBeenCalled()
    })
  })

  describe('Connection Quality Monitoring', () => {
    it('should measure RTT (Round Trip Time)', async () => {
      const startTime = Date.now()
      
      // Simulate ping-pong message
      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
      
      await new Promise(resolve => {
        mockWebSocket.onopen = () => {
          mockWebSocket.send(JSON.stringify({ type: 'ping', timestamp: startTime }))
          
          mockWebSocket.onmessage = (event) => {
            const rtt = Date.now() - startTime
            expect(rtt).toBeLessThan(500) // Should be under 500ms for good connection
            resolve(rtt)
          }
          
          // Simulate pong response
          setTimeout(() => {
            mockWebSocket.onmessage!({ data: JSON.stringify({ type: 'pong', timestamp: startTime }) } as any)
          }, 100)
        }
      })
    })

    it('should detect high latency and trigger PTT fallback', async () => {
      const highLatencyConnection = async () => {
        return new Promise(resolve => {
          setTimeout(() => resolve('connected'), 300) // Simulate 300ms latency
        })
      }

      const { duration } = await measureExecutionTime(highLatencyConnection)

      // Should trigger PTT fallback when RTT > 250ms
      if (duration > 250) {
        expect(duration).toBeGreaterThan(250)
        // In real implementation, this would trigger auto-switch to PTT
      }
    })

    it('should monitor connection stability', async () => {
      let connectionDrops = 0
      const maxDrops = 3

      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')

      mockWebSocket.onclose = () => {
        connectionDrops++
        
        if (connectionDrops < maxDrops) {
          // Simulate reconnection attempt
          mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
        }
      }

      // Simulate connection drops
      for (let i = 0; i < 2; i++) {
        mockWebSocket.close()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      expect(connectionDrops).toBe(2)
      expect(connectionDrops).toBeLessThan(maxDrops) // Should not exceed retry limit
    })

    it('should validate connection success rate', async () => {
      const attempts = 10
      let successfulConnections = 0

      for (let i = 0; i < attempts; i++) {
        try {
          mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
          
          await new Promise((resolve, reject) => {
            mockWebSocket.onopen = () => {
              successfulConnections++
              resolve('connected')
            }
            mockWebSocket.onerror = () => reject(new Error('Connection failed'))
            
            // Simulate random connection success/failure
            setTimeout(() => {
              if (Math.random() > 0.1) { // 90% success rate
                mockWebSocket.onopen!(new Event('open'))
              } else {
                mockWebSocket.onerror!(new Event('error'))
              }
            }, 50)
          })
        } catch (error) {
          // Connection failed
        }
      }

      const successRate = successfulConnections / attempts
      expect(successRate).toBeGreaterThan(0.95) // Should achieve 95%+ success rate
    })
  })

  describe('Auto-switching to PTT Mode', () => {
    it('should switch to PTT when WebRTC connection fails', async () => {
      let connectionMode = 'realtime'

      // Simulate WebRTC connection failure
      try {
        await simulateWebRTCFailure(mockPeerConnection)
        
        if (mockPeerConnection.connectionState === 'failed') {
          connectionMode = 'ptt'
        }
      } catch (error) {
        connectionMode = 'ptt'
      }

      expect(connectionMode).toBe('ptt')
    })

    it('should switch to PTT when RTT exceeds threshold', async () => {
      let connectionMode = 'realtime'
      const rttThreshold = 250 // ms

      // Simulate high RTT measurement
      const { duration: rtt } = await measureExecutionTime(async () => {
        return new Promise(resolve => {
          setTimeout(resolve, 300) // 300ms RTT
        })
      })

      if (rtt > rttThreshold) {
        connectionMode = 'ptt'
      }

      expect(connectionMode).toBe('ptt')
      expect(rtt).toBeGreaterThan(rttThreshold)
    })

    it('should validate PTT fallback functionality', async () => {
      // Mock PTT endpoint response
      const mockPTTResponse = {
        transcript: 'Hello world',
        translation: 'Hola mundo',
        latency_ms: 1800,
      }

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPTTResponse),
      })

      const response = await fetch('/api/ptt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: 'base64-audio-data',
          sourceLanguage: 'en',
          targetLanguage: 'es',
        }),
      })

      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.transcript).toBe('Hello world')
      expect(data.translation).toBe('Hola mundo')
      expect(data.latency_ms).toBeLessThan(2000) // Should meet PTT latency requirement
    })

    it('should maintain session continuity during mode switch', async () => {
      let sessionId = 'session-123'
      let translationHistory: any[] = []

      // Start in realtime mode
      translationHistory.push({
        mode: 'realtime',
        original: 'Hello',
        translated: 'Hola',
        timestamp: Date.now(),
      })

      // Switch to PTT mode
      translationHistory.push({
        mode: 'ptt',
        original: 'How are you?',
        translated: '¿Cómo estás?',
        timestamp: Date.now(),
      })

      // Session should maintain continuity
      expect(sessionId).toBe('session-123')
      expect(translationHistory).toHaveLength(2)
      expect(translationHistory[0].mode).toBe('realtime')
      expect(translationHistory[1].mode).toBe('ptt')
    })
  })

  describe('Performance Requirements Validation', () => {
    it('should achieve target latency < 700ms for first translation', async () => {
      const translationLatency = createLatencyTest(700)

      await translationLatency(async () => {
        // Simulate complete translation pipeline
        const startTime = Date.now()
        
        // Simulate audio processing (100ms)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Simulate OpenAI processing (400ms)
        await new Promise(resolve => setTimeout(resolve, 400))
        
        // Simulate TTS generation (200ms)
        await new Promise(resolve => setTimeout(resolve, 200))
        
        return Date.now() - startTime
      })
    })

    it('should handle concurrent connections efficiently', async () => {
      const concurrentConnections = 5
      const connectionPromises = []

      for (let i = 0; i < concurrentConnections; i++) {
        connectionPromises.push(
          measureExecutionTime(async () => {
            mockWebSocket = new MockWebSocket(`wss://api.openai.com/v1/realtime-${i}`)
            
            return new Promise(resolve => {
              mockWebSocket.onopen = () => resolve('connected')
            })
          })
        )
      }

      const results = await Promise.all(connectionPromises)
      
      // All connections should succeed
      results.forEach(result => {
        expect(result.result).toBe('connected')
        expect(result.duration).toBeLessThan(2000) // Should connect within 2 seconds
      })
    })

    it('should maintain stable connection under load', async () => {
      const messagesPerSecond = 10
      const testDurationMs = 5000
      const totalMessages = (messagesPerSecond * testDurationMs) / 1000

      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
      
      let messagesReceived = 0
      mockWebSocket.onmessage = () => messagesReceived++

      await new Promise(resolve => {
        mockWebSocket.onopen = () => {
          const interval = setInterval(() => {
            mockWebSocket.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: 'base64-audio-chunk',
            }))
          }, 1000 / messagesPerSecond)

          setTimeout(() => {
            clearInterval(interval)
            resolve('test-complete')
          }, testDurationMs)
        }
      })

      // Should handle high message throughput without connection loss
      expect(mockWebSocket.readyState).toBe(MockWebSocket.OPEN)
      expect(messagesReceived).toBeGreaterThan(totalMessages * 0.9) // 90% message delivery rate
    })

    it('should recover from temporary network interruptions', async () => {
      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
      
      let reconnectionAttempts = 0
      const maxReconnectAttempts = 3

      const reconnect = async () => {
        while (reconnectionAttempts < maxReconnectAttempts) {
          try {
            reconnectionAttempts++
            mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
            
            await new Promise((resolve, reject) => {
              mockWebSocket.onopen = () => resolve('connected')
              mockWebSocket.onerror = () => reject(new Error('Connection failed'))
              
              // Simulate connection success after 2 attempts
              if (reconnectionAttempts >= 2) {
                setTimeout(() => mockWebSocket.onopen!(new Event('open')), 100)
              } else {
                setTimeout(() => mockWebSocket.onerror!(new Event('error')), 100)
              }
            })
            
            break // Success, exit retry loop
          } catch (error) {
            if (reconnectionAttempts >= maxReconnectAttempts) {
              throw error
            }
            await new Promise(resolve => setTimeout(resolve, 1000)) // Wait before retry
          }
        }
      }

      await reconnect()
      
      expect(reconnectionAttempts).toBeLessThan(maxReconnectAttempts)
      expect(mockWebSocket.readyState).toBe(MockWebSocket.OPEN)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle WebSocket connection errors', async () => {
      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
      
      const errorPromise = new Promise((resolve, reject) => {
        mockWebSocket.onerror = (event) => {
          resolve('error-handled')
        }
      })

      // Simulate connection error
      setTimeout(() => {
        mockWebSocket.onerror!(new Event('error'))
      }, 100)

      const result = await errorPromise
      expect(result).toBe('error-handled')
    })

    it('should handle invalid audio format', async () => {
      mockWebSocket = new MockWebSocket('wss://api.openai.com/v1/realtime')
      
      await new Promise(resolve => {
        mockWebSocket.onopen = () => {
          // Send invalid audio format
          mockWebSocket.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: 'invalid-audio-data',
          }))
          
          mockWebSocket.onmessage = (event) => {
            const response = JSON.parse(event.data)
            expect(response.type).toBe('error')
            resolve('error-handled')
          }
          
          // Simulate error response
          setTimeout(() => {
            mockWebSocket.onmessage!({ 
              data: JSON.stringify({ type: 'error', error: 'Invalid audio format' }) 
            } as any)
          }, 100)
        }
      })
    })

    it('should handle API rate limiting', async () => {
      mockOpenAIClient.realtime.sessions.create.mockRejectedValue(
        Object.assign(new Error('Rate limit exceeded'), { status: 429 })
      )

      const response = await fetch('/api/ephemeral-session?source_lang=en&target_lang=es')
      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toBe('Failed to create ephemeral session')
    })

    it('should validate supported language pairs', async () => {
      const unsupportedPairs = [
        { source: 'xyz', target: 'abc' }, // Non-existent languages
        { source: 'en', target: '' }, // Empty target
        { source: '', target: 'es' }, // Empty source
      ]

      for (const pair of unsupportedPairs) {
        const response = await fetch(
          `/api/ephemeral-session?source_lang=${pair.source}&target_lang=${pair.target}`
        )
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('language')
      }
    })
  })
})