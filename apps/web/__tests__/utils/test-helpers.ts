import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { Session } from '@supabase/supabase-js'

// Mock session for authenticated tests
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() / 1000 + 3600,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'test@example.com',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    aud: 'authenticated',
    role: 'authenticated',
    app_metadata: {},
    user_metadata: {},
  },
}

// Mock profile data
export const mockProfile = {
  id: 'user-123',
  plan: 'free' as const,
  display_name: 'Test User',
  created_at: '2023-01-01T00:00:00Z',
}

// Mock translation session
export const mockTranslationSession = {
  id: 'session-123',
  user_id: 'user-123',
  source_lang: 'en',
  target_lang: 'es',
  mode: 'live' as const,
  started_at: '2023-01-01T00:00:00Z',
  ended_at: null,
  duration_ms: null,
  characters: 0,
  cost_cents: 0,
}

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {children}
    </div>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Helper to wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Helper to create mock audio context
export const createMockAudioContext = () => ({
  state: 'running',
  sampleRate: 44100,
  createMediaStreamSource: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }),
  createScriptProcessor: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null,
  }),
  createAnalyser: jest.fn().mockReturnValue({
    connect: jest.fn(),
    disconnect: jest.fn(),
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
  }),
  resume: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
})

// Helper to create mock media stream
export const createMockMediaStream = () => ({
  id: 'mock-stream',
  getTracks: jest.fn().mockReturnValue([{
    kind: 'audio',
    id: 'mock-track',
    enabled: true,
    stop: jest.fn(),
  }]),
  getAudioTracks: jest.fn().mockReturnValue([{
    kind: 'audio',
    id: 'mock-track',
    enabled: true,
    stop: jest.fn(),
  }]),
})

// Helper to create mock WebRTC peer connection
export const createMockRTCPeerConnection = () => ({
  connectionState: 'new',
  iceConnectionState: 'new',
  localDescription: null,
  remoteDescription: null,
  onconnectionstatechange: null,
  oniceconnectionstatechange: null,
  ondatachannel: null,
  createOffer: jest.fn().mockResolvedValue({
    type: 'offer',
    sdp: 'mock-sdp',
  }),
  createAnswer: jest.fn().mockResolvedValue({
    type: 'answer',
    sdp: 'mock-sdp',
  }),
  setLocalDescription: jest.fn().mockResolvedValue(undefined),
  setRemoteDescription: jest.fn().mockResolvedValue(undefined),
  addIceCandidate: jest.fn().mockResolvedValue(undefined),
  createDataChannel: jest.fn().mockReturnValue({
    label: 'test',
    readyState: 'open',
    send: jest.fn(),
    close: jest.fn(),
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
  }),
  close: jest.fn(),
})

// Performance timing utilities
export const measureLatency = {
  start: performance.now(),
  end: () => performance.now() - measureLatency.start,
  reset: () => { measureLatency.start = performance.now() },
}

// Enhanced mock data generators
export const createMockStripeCustomer = (overrides: any = {}) => ({
  id: 'cus_test123',
  email: 'test@example.com',
  name: 'Test User',
  created: 1640995200,
  subscriptions: {
    data: [
      {
        id: 'sub_test123',
        status: 'active',
        current_period_end: 1672531200,
        items: {
          data: [
            {
              price: {
                id: 'price_pro_monthly',
                unit_amount: 2000,
                currency: 'usd',
                nickname: 'Pro Monthly',
              },
            },
          ],
        },
      },
    ],
  },
  ...overrides,
})

export const createMockStripeWebhookEvent = (type: string, data: any) => ({
  id: 'evt_test123',
  object: 'event',
  api_version: '2020-08-27',
  created: Date.now() / 1000,
  data: {
    object: data,
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test123',
    idempotency_key: null,
  },
  type,
})

// Audio testing utilities
export const createMockAudioBuffer = (duration: number = 1.0, sampleRate: number = 44100) => {
  const length = duration * sampleRate
  const buffer = new Float32Array(length)
  
  // Generate a simple sine wave for testing
  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1
  }
  
  return buffer
}

export const createMockMediaRecorder = () => {
  const mediaRecorder = {
    state: 'inactive',
    stream: createMockMediaStream(),
    mimeType: 'audio/wav',
    start: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    requestData: jest.fn(),
    ondataavailable: null,
    onstart: null,
    onstop: null,
    onerror: null,
    onpause: null,
    onresume: null,
  }
  
  return mediaRecorder
}

// WebRTC connection simulation utilities
export const simulateWebRTCConnection = async (mockConnection: any) => {
  // Simulate connection establishment
  mockConnection.connectionState = 'connecting'
  mockConnection.iceConnectionState = 'checking'
  
  await new Promise(resolve => setTimeout(resolve, 100))
  
  mockConnection.connectionState = 'connected'
  mockConnection.iceConnectionState = 'connected'
  
  if (mockConnection.onconnectionstatechange) {
    mockConnection.onconnectionstatechange()
  }
  
  if (mockConnection.oniceconnectionstatechange) {
    mockConnection.oniceconnectionstatechange()
  }
}

export const simulateWebRTCFailure = async (mockConnection: any) => {
  mockConnection.connectionState = 'failed'
  mockConnection.iceConnectionState = 'failed'
  
  if (mockConnection.onconnectionstatechange) {
    mockConnection.onconnectionstatechange()
  }
}

// Performance testing utilities
export const measureExecutionTime = async <T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  
  return {
    result,
    duration: end - start,
  }
}

export const createLatencyTest = (targetLatency: number) => {
  return async (fn: () => Promise<any>) => {
    const { duration } = await measureExecutionTime(fn)
    expect(duration).toBeLessThan(targetLatency)
    return duration
  }
}

// Authentication testing utilities
export const createMockSupabaseClient = (overrides: any = {}) => {
  const defaultMethods = {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ 
        data: { session: mockSession }, 
        error: null 
      })),
      signInWithOtp: jest.fn(() => Promise.resolve({ 
        data: {}, 
        error: null 
      })),
      signOut: jest.fn(() => Promise.resolve({ 
        error: null 
      })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ 
            data: mockProfile, 
            error: null 
          })),
        })),
        limit: jest.fn(() => Promise.resolve({ 
          data: [], 
          error: null 
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ 
        data: [mockProfile], 
        error: null 
      })),
      update: jest.fn(() => Promise.resolve({ 
        data: [mockProfile], 
        error: null 
      })),
      delete: jest.fn(() => Promise.resolve({ 
        data: [], 
        error: null 
      })),
    })),
  }
  
  return {
    ...defaultMethods,
    ...overrides,
  }
}

// API testing utilities
export const createMockRequest = (method: string, body?: any, headers?: Record<string, string>) => {
  return {
    method,
    headers: new Headers(headers),
    json: jest.fn(() => Promise.resolve(body)),
    text: jest.fn(() => Promise.resolve(JSON.stringify(body))),
    url: 'https://test.example.com',
  }
}

export const createMockResponse = (status: number, data?: any, headers?: Record<string, string>) => {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data))),
  }
}

// Cleanup utilities
export const cleanupMocks = () => {
  jest.clearAllMocks()
  
  // Reset global fetch mock
  if (global.fetch) {
    (global.fetch as jest.Mock).mockClear()
  }
}

// Wait utilities for async testing
export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now()
  
  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms timeout`)
  }
}