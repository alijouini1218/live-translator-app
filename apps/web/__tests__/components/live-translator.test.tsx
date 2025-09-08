/**
 * Live Translator Component Tests
 * Tests the main translation component with realtime and PTT modes,
 * audio controls, error handling, and performance monitoring
 */

import { render, screen, fireEvent, waitFor } from '../utils/test-helpers'
import { LiveTranslator } from '@/components/translator/live-translator'
import { 
  mockSession, 
  createMockSupabaseClient,
  simulateWebRTCConnection,
  createMockWebRTCConnection,
  createMockAudioBuffer,
  createMockMediaRecorder
} from '../utils/test-helpers'
import { MockWebSocket, mockOpenAIClient } from '../utils/mocks'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => createMockSupabaseClient(),
}))

jest.mock('@/hooks/use-realtime-translation', () => ({
  useRealtimeTranslation: () => ({
    isConnected: true,
    connectionMode: 'realtime',
    startTranslation: jest.fn(),
    stopTranslation: jest.fn(),
    translations: [],
    error: null,
    connectionLatency: 150,
    isConnecting: false,
  }),
}))

jest.mock('@/hooks/use-ptt-translation', () => ({
  usePTTTranslation: () => ({
    isRecording: false,
    startRecording: jest.fn(),
    stopRecording: jest.fn(),
    translations: [],
    error: null,
    isProcessing: false,
  }),
}))

jest.mock('@/hooks/use-audio-controls', () => ({
  useAudioControls: () => ({
    isPlaying: false,
    volume: 1.0,
    setVolume: jest.fn(),
    playAudio: jest.fn(),
    stopAudio: jest.fn(),
    audioQueue: [],
    isDucking: false,
  }),
}))

// Mock Web Audio API
global.AudioContext = jest.fn(() => ({
  state: 'running',
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  createScriptProcessor: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    onaudioprocess: null,
  })),
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
  })),
  resume: jest.fn(() => Promise.resolve()),
  close: jest.fn(() => Promise.resolve()),
}))

// Mock MediaRecorder
global.MediaRecorder = jest.fn(() => createMockMediaRecorder()) as any

// Mock WebSocket
global.WebSocket = MockWebSocket as any

describe('LiveTranslator', () => {
  let mockAudioContext: any
  let mockPeerConnection: any

  beforeEach(() => {
    jest.clearAllMocks()
    mockAudioContext = new AudioContext()
    mockPeerConnection = createMockWebRTCConnection()
    global.RTCPeerConnection = jest.fn(() => mockPeerConnection)
    
    // Mock getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: jest.fn(() => Promise.resolve({
          id: 'mock-stream',
          getTracks: () => [{
            kind: 'audio',
            stop: jest.fn(),
            enabled: true,
          }],
        })),
      },
    })
  })

  describe('Component Rendering', () => {
    it('should render translation interface correctly', () => {
      render(<LiveTranslator />)

      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByText(/Language Selector/i)).toBeInTheDocument()
      expect(screen.getByText(/Translation Mode/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Start Translation/i })).toBeInTheDocument()
    })

    it('should display language selector with default values', () => {
      render(<LiveTranslator />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      const targetSelect = screen.getByLabelText(/Target Language/i)

      expect(sourceSelect).toBeInTheDocument()
      expect(targetSelect).toBeInTheDocument()
      expect(sourceSelect).toHaveValue('en') // Default to English
      expect(targetSelect).toHaveValue('es') // Default to Spanish
    })

    it('should show translation mode toggle', () => {
      render(<LiveTranslator />)

      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      expect(modeToggle).toBeInTheDocument()
      expect(modeToggle).toBeChecked() // Default to realtime mode
    })

    it('should display audio controls when available', () => {
      render(<LiveTranslator />)

      expect(screen.getByLabelText(/Volume/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Mute/i })).toBeInTheDocument()
    })

    it('should show performance metrics when enabled', () => {
      render(<LiveTranslator />)

      // Performance metrics should be visible
      expect(screen.getByText(/Connection Latency/i)).toBeInTheDocument()
      expect(screen.getByText(/150ms/i)).toBeInTheDocument() // Mocked latency
    })
  })

  describe('Realtime Mode Functionality', () => {
    it('should start realtime translation successfully', async () => {
      const mockStartTranslation = jest.fn()
      
      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: false,
          connectionMode: 'realtime',
          startTranslation: mockStartTranslation,
          stopTranslation: jest.fn(),
          translations: [],
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      const startButton = screen.getByRole('button', { name: /Start Translation/i })
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(mockStartTranslation).toHaveBeenCalledWith({
          sourceLanguage: 'en',
          targetLanguage: 'es',
        })
      })
    })

    it('should display connection status during realtime mode', async () => {
      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: false,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: [],
          error: null,
          connectionLatency: 150,
          isConnecting: true,
        }),
      }))

      render(<LiveTranslator />)

      expect(screen.getByText(/Connecting/i)).toBeInTheDocument()
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should show translation results in realtime', async () => {
      const mockTranslations = [
        {
          id: '1',
          original: 'Hello, how are you?',
          translated: 'Hola, ¿cómo estás?',
          timestamp: Date.now(),
          mode: 'realtime',
          latency: 650,
        },
      ]

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: true,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: mockTranslations,
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByText('Hello, how are you?')).toBeInTheDocument()
        expect(screen.getByText('Hola, ¿cómo estás?')).toBeInTheDocument()
      })
    })

    it('should handle realtime connection errors gracefully', async () => {
      const mockError = 'WebRTC connection failed'

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: false,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: [],
          error: mockError,
          connectionLatency: null,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(mockError)).toBeInTheDocument()
      })
    })
  })

  describe('PTT Mode Functionality', () => {
    it('should switch to PTT mode when toggle is clicked', async () => {
      render(<LiveTranslator />)

      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      fireEvent.click(modeToggle)

      await waitFor(() => {
        expect(modeToggle).not.toBeChecked()
        expect(screen.getByRole('button', { name: /Hold to Speak/i })).toBeInTheDocument()
      })
    })

    it('should start recording on PTT button press', async () => {
      const mockStartRecording = jest.fn()

      jest.doMock('@/hooks/use-ptt-translation', () => ({
        usePTTTranslation: () => ({
          isRecording: false,
          startRecording: mockStartRecording,
          stopRecording: jest.fn(),
          translations: [],
          error: null,
          isProcessing: false,
        }),
      }))

      render(<LiveTranslator />)

      // Switch to PTT mode
      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      fireEvent.click(modeToggle)

      const pttButton = screen.getByRole('button', { name: /Hold to Speak/i })
      fireEvent.mouseDown(pttButton)

      await waitFor(() => {
        expect(mockStartRecording).toHaveBeenCalled()
      })
    })

    it('should stop recording on PTT button release', async () => {
      const mockStopRecording = jest.fn()

      jest.doMock('@/hooks/use-ptt-translation', () => ({
        usePTTTranslation: () => ({
          isRecording: true,
          startRecording: jest.fn(),
          stopRecording: mockStopRecording,
          translations: [],
          error: null,
          isProcessing: false,
        }),
      }))

      render(<LiveTranslator />)

      // Switch to PTT mode
      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      fireEvent.click(modeToggle)

      const pttButton = screen.getByRole('button', { name: /Hold to Speak/i })
      fireEvent.mouseUp(pttButton)

      await waitFor(() => {
        expect(mockStopRecording).toHaveBeenCalled()
      })
    })

    it('should show recording status during PTT', async () => {
      jest.doMock('@/hooks/use-ptt-translation', () => ({
        usePTTTranslation: () => ({
          isRecording: true,
          startRecording: jest.fn(),
          stopRecording: jest.fn(),
          translations: [],
          error: null,
          isProcessing: false,
        }),
      }))

      render(<LiveTranslator />)

      // Switch to PTT mode
      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      fireEvent.click(modeToggle)

      await waitFor(() => {
        expect(screen.getByText(/Recording/i)).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveClass('recording')
      })
    })

    it('should show processing status after PTT recording', async () => {
      jest.doMock('@/hooks/use-ptt-translation', () => ({
        usePTTTranslation: () => ({
          isRecording: false,
          startRecording: jest.fn(),
          stopRecording: jest.fn(),
          translations: [],
          error: null,
          isProcessing: true,
        }),
      }))

      render(<LiveTranslator />)

      // Switch to PTT mode
      const modeToggle = screen.getByRole('switch', { name: /Translation Mode/i })
      fireEvent.click(modeToggle)

      await waitFor(() => {
        expect(screen.getByText(/Processing/i)).toBeInTheDocument()
        expect(screen.getByRole('progressbar')).toBeInTheDocument()
      })
    })
  })

  describe('Language Selection', () => {
    it('should update source language when changed', async () => {
      render(<LiveTranslator />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'fr' } })

      await waitFor(() => {
        expect(sourceSelect).toHaveValue('fr')
      })
    })

    it('should update target language when changed', async () => {
      render(<LiveTranslator />)

      const targetSelect = screen.getByLabelText(/Target Language/i)
      fireEvent.change(targetSelect, { target: { value: 'de' } })

      await waitFor(() => {
        expect(targetSelect).toHaveValue('de')
      })
    })

    it('should swap languages when swap button is clicked', async () => {
      render(<LiveTranslator />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      const targetSelect = screen.getByLabelText(/Target Language/i)
      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })

      // Initial state: en -> es
      expect(sourceSelect).toHaveValue('en')
      expect(targetSelect).toHaveValue('es')

      fireEvent.click(swapButton)

      await waitFor(() => {
        // After swap: es -> en
        expect(sourceSelect).toHaveValue('es')
        expect(targetSelect).toHaveValue('en')
      })
    })

    it('should validate language pair compatibility', async () => {
      render(<LiveTranslator />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'unsupported-lang' } })

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Unsupported language pair/i)).toBeInTheDocument()
      })
    })
  })

  describe('Audio Controls', () => {
    it('should adjust volume when slider is moved', async () => {
      const mockSetVolume = jest.fn()

      jest.doMock('@/hooks/use-audio-controls', () => ({
        useAudioControls: () => ({
          isPlaying: false,
          volume: 1.0,
          setVolume: mockSetVolume,
          playAudio: jest.fn(),
          stopAudio: jest.fn(),
          audioQueue: [],
          isDucking: false,
        }),
      }))

      render(<LiveTranslator />)

      const volumeSlider = screen.getByLabelText(/Volume/i)
      fireEvent.change(volumeSlider, { target: { value: '0.5' } })

      await waitFor(() => {
        expect(mockSetVolume).toHaveBeenCalledWith(0.5)
      })
    })

    it('should mute/unmute audio when mute button is clicked', async () => {
      const mockSetVolume = jest.fn()

      jest.doMock('@/hooks/use-audio-controls', () => ({
        useAudioControls: () => ({
          isPlaying: false,
          volume: 1.0,
          setVolume: mockSetVolume,
          playAudio: jest.fn(),
          stopAudio: jest.fn(),
          audioQueue: [],
          isDucking: false,
        }),
      }))

      render(<LiveTranslator />)

      const muteButton = screen.getByRole('button', { name: /Mute/i })
      fireEvent.click(muteButton)

      await waitFor(() => {
        expect(mockSetVolume).toHaveBeenCalledWith(0)
      })
    })

    it('should show audio ducking indicator during playback', async () => {
      jest.doMock('@/hooks/use-audio-controls', () => ({
        useAudioControls: () => ({
          isPlaying: true,
          volume: 1.0,
          setVolume: jest.fn(),
          playAudio: jest.fn(),
          stopAudio: jest.fn(),
          audioQueue: [{ id: '1', text: 'Playing audio' }],
          isDucking: true,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByText(/Audio Ducking Active/i)).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveClass('ducking')
      })
    })
  })

  describe('Translation Display', () => {
    it('should display translation history correctly', async () => {
      const mockTranslations = [
        {
          id: '1',
          original: 'Hello',
          translated: 'Hola',
          timestamp: Date.now() - 1000,
          mode: 'realtime',
          latency: 650,
        },
        {
          id: '2',
          original: 'How are you?',
          translated: '¿Cómo estás?',
          timestamp: Date.now(),
          mode: 'ptt',
          latency: 1800,
        },
      ]

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: true,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: mockTranslations,
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument()
        expect(screen.getByText('Hola')).toBeInTheDocument()
        expect(screen.getByText('How are you?')).toBeInTheDocument()
        expect(screen.getByText('¿Cómo estás?')).toBeInTheDocument()
      })
    })

    it('should show latency information for translations', async () => {
      const mockTranslations = [
        {
          id: '1',
          original: 'Hello',
          translated: 'Hola',
          timestamp: Date.now(),
          mode: 'realtime',
          latency: 650,
        },
      ]

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: true,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: mockTranslations,
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByText(/650ms/i)).toBeInTheDocument()
      })
    })

    it('should auto-scroll to latest translation', async () => {
      const scrollIntoViewMock = jest.fn()
      Element.prototype.scrollIntoView = scrollIntoViewMock

      const mockTranslations = [
        {
          id: '1',
          original: 'Latest translation',
          translated: 'Última traducción',
          timestamp: Date.now(),
          mode: 'realtime',
          latency: 650,
        },
      ]

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: true,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: mockTranslations,
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalledWith({ 
          behavior: 'smooth', 
          block: 'end' 
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should display permission errors clearly', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn(() => 
            Promise.reject(new Error('Permission denied'))
          ),
        },
      })

      render(<LiveTranslator />)

      const startButton = screen.getByRole('button', { name: /Start Translation/i })
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Permission denied/i)).toBeInTheDocument()
        expect(screen.getByText(/Please allow microphone access/i)).toBeInTheDocument()
      })
    })

    it('should show connection error with retry option', async () => {
      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: false,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: [],
          error: 'Connection failed',
          connectionLatency: null,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Connection failed/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
      })
    })

    it('should automatically switch to PTT on persistent realtime errors', async () => {
      let attemptCount = 0
      const mockStartTranslation = jest.fn(() => {
        attemptCount++
        if (attemptCount >= 3) {
          // Switch to PTT mode after 3 failed attempts
          return Promise.resolve()
        }
        return Promise.reject(new Error('Connection failed'))
      })

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: false,
          connectionMode: attemptCount >= 3 ? 'ptt' : 'realtime',
          startTranslation: mockStartTranslation,
          stopTranslation: jest.fn(),
          translations: [],
          error: attemptCount < 3 ? 'Connection failed' : null,
          connectionLatency: null,
          isConnecting: false,
        }),
      }))

      render(<LiveTranslator />)

      const startButton = screen.getByRole('button', { name: /Start Translation/i })
      
      // Try multiple times
      fireEvent.click(startButton)
      await new Promise(resolve => setTimeout(resolve, 100))
      fireEvent.click(startButton)
      await new Promise(resolve => setTimeout(resolve, 100))
      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByText(/Switched to PTT mode/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Hold to Speak/i })).toBeInTheDocument()
      })
    })
  })

  describe('Performance and Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<LiveTranslator />)

      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByLabelText(/Source Language/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Target Language/i)).toBeInTheDocument()
      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', /Translation Mode/i)
      expect(screen.getByRole('button', { name: /Start Translation/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<LiveTranslator />)

      const startButton = screen.getByRole('button', { name: /Start Translation/i })
      
      // Tab to button and press Enter
      startButton.focus()
      fireEvent.keyDown(startButton, { key: 'Enter' })

      // Should trigger the same action as click
      await waitFor(() => {
        expect(startButton).toHaveFocus()
      })
    })

    it('should handle rapid language changes efficiently', async () => {
      render(<LiveTranslator />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      
      // Rapid language changes
      const languages = ['en', 'fr', 'de', 'es', 'ja']
      languages.forEach((lang, index) => {
        setTimeout(() => {
          fireEvent.change(sourceSelect, { target: { value: lang } })
        }, index * 10)
      })

      await waitFor(() => {
        expect(sourceSelect).toHaveValue('ja') // Final value
      }, { timeout: 1000 })

      // Should not cause performance issues or errors
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('should manage memory efficiently with long translation sessions', async () => {
      // Mock a large number of translations
      const manyTranslations = Array.from({ length: 100 }, (_, i) => ({
        id: `translation-${i}`,
        original: `Original text ${i}`,
        translated: `Translated text ${i}`,
        timestamp: Date.now() - (100 - i) * 1000,
        mode: 'realtime' as const,
        latency: 650,
      }))

      jest.doMock('@/hooks/use-realtime-translation', () => ({
        useRealtimeTranslation: () => ({
          isConnected: true,
          connectionMode: 'realtime',
          startTranslation: jest.fn(),
          stopTranslation: jest.fn(),
          translations: manyTranslations,
          error: null,
          connectionLatency: 150,
          isConnecting: false,
        }),
      }))

      const { container } = render(<LiveTranslator />)

      await waitFor(() => {
        // Should render efficiently even with many translations
        const translationElements = container.querySelectorAll('[data-testid="translation-item"]')
        expect(translationElements.length).toBeLessThanOrEqual(50) // Should implement virtualization
      })
    })
  })
})