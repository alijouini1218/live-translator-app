import '@testing-library/jest-dom'

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  
  observe() {
    return null
  }
  
  disconnect() {
    return null
  }
  
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock AudioContext for WebRTC tests
global.AudioContext = class AudioContext {
  constructor() {
    this.state = 'suspended'
    this.sampleRate = 44100
  }
  
  createMediaStreamSource() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
    }
  }
  
  createScriptProcessor() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onaudioprocess: null,
    }
  }
  
  createAnalyser() {
    return {
      connect: jest.fn(),
      disconnect: jest.fn(),
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn(),
    }
  }
  
  resume() {
    return Promise.resolve()
  }
  
  close() {
    return Promise.resolve()
  }
}

// Mock MediaDevices for getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => Promise.resolve({
      id: 'mock-stream',
      getTracks: () => [{
        kind: 'audio',
        id: 'mock-track',
        enabled: true,
        stop: jest.fn(),
      }],
      getAudioTracks: () => [{
        kind: 'audio',
        id: 'mock-track',
        enabled: true,
        stop: jest.fn(),
      }],
    })),
    enumerateDevices: jest.fn(() => Promise.resolve([])),
  },
})

// Mock RTCPeerConnection for WebRTC tests
global.RTCPeerConnection = class RTCPeerConnection {
  constructor() {
    this.connectionState = 'new'
    this.iceConnectionState = 'new'
    this.localDescription = null
    this.remoteDescription = null
    this.onconnectionstatechange = null
    this.oniceconnectionstatechange = null
    this.ondatachannel = null
  }
  
  createOffer() {
    return Promise.resolve({
      type: 'offer',
      sdp: 'mock-sdp',
    })
  }
  
  createAnswer() {
    return Promise.resolve({
      type: 'answer',
      sdp: 'mock-sdp',
    })
  }
  
  setLocalDescription(desc) {
    this.localDescription = desc
    return Promise.resolve()
  }
  
  setRemoteDescription(desc) {
    this.remoteDescription = desc
    return Promise.resolve()
  }
  
  addIceCandidate() {
    return Promise.resolve()
  }
  
  createDataChannel(label) {
    return {
      label,
      readyState: 'open',
      send: jest.fn(),
      close: jest.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
    }
  }
  
  close() {}
}

// Mock WebSocket for fallback connections
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onmessage = null
    this.onerror = null
    this.onclose = null
  }
  
  send() {}
  close() {}
}

// Mock fetch for API calls
global.fetch = jest.fn()

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase-url.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock'