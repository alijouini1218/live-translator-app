import { http, HttpResponse } from 'msw'

// Mock Supabase Client
export const mockSupabaseClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithOtp: jest.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    exchangeCodeForSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
}

// Mock Stripe
export const mockStripeJs = {
  redirectToCheckout: jest.fn().mockResolvedValue({ error: null }),
  confirmCardPayment: jest.fn().mockResolvedValue({ error: null }),
}

// Mock OpenAI Client
export const mockOpenAIClient = {
  realtime: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'session-123',
        client_secret: {
          value: 'mock-client-secret',
        },
      }),
    },
  },
  audio: {
    speech: {
      create: jest.fn().mockResolvedValue(new Response('mock-audio-data')),
    },
    transcriptions: {
      create: jest.fn().mockResolvedValue({
        text: 'Hello, how are you?',
      }),
    },
  },
  chat: {
    completions: {
      create: jest.fn().mockResolvedValue({
        choices: [{
          message: {
            content: 'Hola, ¿cómo estás?',
          },
        }],
      }),
    },
  },
}

// MSW Handlers for API mocking
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/signin', () => {
    return HttpResponse.json({ success: true })
  }),

  // Ephemeral session endpoint
  http.get('/api/ephemeral-session', () => {
    return HttpResponse.json({
      id: 'session-123',
      client_secret: {
        value: 'mock-client-secret',
      },
    })
  }),

  // TTS endpoint
  http.post('/api/tts', async ({ request }) => {
    const body = await request.json()
    const mockAudioStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
        controller.close()
      },
    })
    return new HttpResponse(mockAudioStream, {
      headers: {
        'Content-Type': 'audio/mp3',
      },
    })
  }),

  // PTT endpoint
  http.post('/api/ptt', async ({ request }) => {
    return HttpResponse.json({
      transcript: 'Hello world',
      translation: 'Hola mundo',
    })
  }),

  // Stripe checkout
  http.post('/api/checkout', () => {
    return HttpResponse.json({
      url: 'https://checkout.stripe.com/session-123',
    })
  }),

  // Stripe webhook
  http.post('/api/stripe-webhook', () => {
    return HttpResponse.json({ received: true })
  }),

  // Customer portal
  http.post('/api/customer-portal', () => {
    return HttpResponse.json({
      url: 'https://billing.stripe.com/session-123',
    })
  }),

  // ElevenLabs TTS (external)
  http.post('https://api.elevenlabs.io/v1/text-to-speech/:voiceId/stream', () => {
    const mockAudioStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
        controller.close()
      },
    })
    return new HttpResponse(mockAudioStream, {
      headers: {
        'Content-Type': 'audio/mp3',
      },
    })
  }),

  // OpenAI API (external)
  http.post('https://api.openai.com/v1/realtime/sessions', () => {
    return HttpResponse.json({
      id: 'session-123',
      client_secret: {
        value: 'mock-client-secret',
      },
    })
  }),

  http.post('https://api.openai.com/v1/audio/transcriptions', () => {
    return HttpResponse.json({
      text: 'Hello, how are you?',
    })
  }),

  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      choices: [{
        message: {
          content: 'Hola, ¿cómo estás?',
        },
      }],
    })
  }),
]

// Utility to create mock responses with different scenarios
export const createMockResponse = {
  success: (data: any) => HttpResponse.json(data),
  error: (message: string, status = 400) => 
    HttpResponse.json({ error: message }, { status }),
  stream: (data: Uint8Array) => 
    new HttpResponse(new ReadableStream({
      start(controller) {
        controller.enqueue(data)
        controller.close()
      },
    })),
}

// Mock environment variables for tests
export const mockEnvVars = {
  OPENAI_API_KEY: 'mock-openai-key',
  ELEVENLABS_API_KEY: 'mock-elevenlabs-key',
  STRIPE_SECRET_KEY: 'sk_test_mock',
  STRIPE_WEBHOOK_SECRET: 'whsec_mock',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_mock',
  NEXT_PUBLIC_SUPABASE_URL: 'https://mock.supabase.co',
  SUPABASE_ANON_KEY: 'mock-anon-key',
  SUPABASE_SERVICE_ROLE: 'mock-service-role',
}

// Mock WebSocket for OpenAI Realtime API
export class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 100)
  }

  send(data: string | ArrayBuffer | Blob) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    
    // Echo back for testing
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { data: 'mock-response' }))
      }
    }, 50)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code: code || 1000, reason }))
    }
  }
}

// Mock MediaRecorder for PTT testing
export class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true)

  state: 'inactive' | 'recording' | 'paused' = 'inactive'
  stream: MediaStream
  mimeType: string
  ondataavailable: ((event: BlobEvent) => void) | null = null
  onstart: ((event: Event) => void) | null = null
  onstop: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onpause: ((event: Event) => void) | null = null
  onresume: ((event: Event) => void) | null = null

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream
    this.mimeType = options?.mimeType || 'audio/webm'
  }

  start(timeslice?: number) {
    this.state = 'recording'
    if (this.onstart) {
      this.onstart(new Event('start'))
    }
    
    // Simulate data availability
    setTimeout(() => {
      if (this.ondataavailable) {
        const mockBlob = new Blob(['mock audio data'], { type: this.mimeType })
        const blobEvent = new BlobEvent('dataavailable', { data: mockBlob })
        this.ondataavailable(blobEvent)
      }
    }, timeslice || 1000)
  }

  stop() {
    this.state = 'inactive'
    if (this.onstop) {
      this.onstop(new Event('stop'))
    }
  }

  pause() {
    this.state = 'paused'
    if (this.onpause) {
      this.onpause(new Event('pause'))
    }
  }

  resume() {
    this.state = 'recording'
    if (this.onresume) {
      this.onresume(new Event('resume'))
    }
  }

  requestData() {
    if (this.ondataavailable) {
      const mockBlob = new Blob(['mock audio data'], { type: this.mimeType })
      const blobEvent = new BlobEvent('dataavailable', { data: mockBlob })
      this.ondataavailable(blobEvent)
    }
  }
}

// Mock Voice Activity Detection
export const mockVAD = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  destroy: jest.fn(),
  setMinDecibels: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}

// Mock ElevenLabs client
export const mockElevenLabsClient = {
  textToSpeech: {
    convert: jest.fn().mockResolvedValue(new Blob(['mock audio'], { type: 'audio/mp3' })),
    convertAsStream: jest.fn().mockReturnValue(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4, 5]))
          controller.close()
        },
      })
    ),
  },
  voices: {
    getAll: jest.fn().mockResolvedValue([
      {
        voice_id: 'voice-1',
        name: 'Test Voice',
        category: 'premade',
        settings: {
          stability: 0.5,
          similarity_boost: 0.7,
        },
      },
    ]),
  },
}

// Mock Stripe server client
export const mockStripeServer = {
  customers: {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com',
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com',
      subscriptions: {
        data: [
          {
            id: 'sub_test123',
            status: 'active',
            current_period_end: 1672531200,
          },
        ],
      },
    }),
    update: jest.fn().mockResolvedValue({
      id: 'cus_test123',
      email: 'test@example.com',
    }),
  },
  checkout: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        id: 'cs_test123',
        url: 'https://checkout.stripe.com/pay/cs_test123',
      }),
    },
  },
  billingPortal: {
    sessions: {
      create: jest.fn().mockResolvedValue({
        url: 'https://billing.stripe.com/session-123',
      }),
    },
  },
  webhooks: {
    constructEvent: jest.fn().mockReturnValue({
      id: 'evt_test123',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test123',
          customer: 'cus_test123',
          status: 'active',
        },
      },
    }),
  },
}

// Mock performance metrics
export const mockPerformanceMetrics = {
  realtimeConnectionLatency: 150, // ms
  translationLatency: 650, // ms
  ttsLatency: 300, // ms
  totalLatency: 800, // ms
  connectionSuccess: true,
  errorRate: 0.02, // 2%
}

// Mock translation quality metrics
export const mockTranslationMetrics = {
  accuracy: 0.95,
  fluency: 0.92,
  completeness: 0.98,
  confidence: 0.91,
}

// Utility functions for test scenarios
export const createFailureScenarios = {
  networkError: () => {
    throw new Error('Network request failed')
  },
  authenticationError: () => HttpResponse.json(
    { error: 'Unauthorized' }, 
    { status: 401 }
  ),
  rateLimitError: () => HttpResponse.json(
    { error: 'Too many requests' }, 
    { status: 429 }
  ),
  serverError: () => HttpResponse.json(
    { error: 'Internal server error' }, 
    { status: 500 }
  ),
  validationError: () => HttpResponse.json(
    { error: 'Invalid input parameters' }, 
    { status: 400 }
  ),
}

// Mock analytics and monitoring
export const mockAnalytics = {
  track: jest.fn(),
  identify: jest.fn(),
  page: jest.fn(),
  group: jest.fn(),
  alias: jest.fn(),
}

// Reset all mocks utility
export const resetAllMocks = () => {
  jest.clearAllMocks()
  Object.values(mockSupabaseClient.auth).forEach((fn: any) => {
    if (typeof fn === 'function') fn.mockClear()
  })
  Object.values(mockOpenAIClient.realtime.sessions).forEach((fn: any) => {
    if (typeof fn === 'function') fn.mockClear()
  })
  Object.values(mockStripeServer.customers).forEach((fn: any) => {
    if (typeof fn === 'function') fn.mockClear()
  })
}