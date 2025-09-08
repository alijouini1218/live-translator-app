import { test, expect } from '@playwright/test'

test.describe('Realtime Translation E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    // Mock microphone permission
    await page.context().grantPermissions(['microphone'], { origin: 'http://localhost:3000' })
    
    // Mock WebRTC and audio APIs
    await page.addInitScript(() => {
      // Mock RTCPeerConnection
      window.RTCPeerConnection = class MockRTCPeerConnection extends EventTarget {
        connectionState = 'new'
        localDescription = null
        remoteDescription = null
        
        async createOffer() {
          return { type: 'offer', sdp: 'mock-sdp' }
        }
        
        async createAnswer() {
          return { type: 'answer', sdp: 'mock-sdp' }
        }
        
        async setLocalDescription(desc) {
          this.localDescription = desc
        }
        
        async setRemoteDescription(desc) {
          this.remoteDescription = desc
          setTimeout(() => {
            this.connectionState = 'connected'
            this.dispatchEvent(new Event('connectionstatechange'))
          }, 100)
        }
        
        createDataChannel(label) {
          const channel = {
            label,
            readyState: 'open',
            send: () => {},
            close: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
          }
          
          // Simulate receiving data after connection
          setTimeout(() => {
            if (channel.onmessage) {
              channel.onmessage({
                data: JSON.stringify({
                  type: 'transcription',
                  text: 'Hello, how are you?',
                  is_final: false
                })
              })
              
              setTimeout(() => {
                channel.onmessage({
                  data: JSON.stringify({
                    type: 'translation',
                    text: 'Hola, ¿cómo estás?',
                    is_final: true
                  })
                })
              }, 500)
            }
          }, 1000)
          
          return channel
        }
        
        close() {}
      }
      
      // Mock getUserMedia
      navigator.mediaDevices.getUserMedia = async () => ({
        id: 'mock-stream',
        getTracks: () => [{
          kind: 'audio',
          id: 'mock-track',
          enabled: true,
          stop: () => {}
        }],
        getAudioTracks: () => [{
          kind: 'audio',
          id: 'mock-track',
          enabled: true,
          stop: () => {}
        }]
      })
    })

    // Mock ephemeral session API
    await page.route('/api/ephemeral-session*', (route) => {
      route.fulfill({
        json: {
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
          expires_at: Date.now() + 3600000,
          voice: 'alloy',
          turn_detection: { type: 'server_vad' }
        }
      })
    })
  })

  test('should successfully connect to realtime translation', async ({ page }) => {
    await page.goto('/app')
    
    // Select language pair
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    // Start realtime translation
    await page.getByRole('button', { name: /start/i }).click()
    
    // Should show connecting state
    await expect(page.getByText(/connecting/i)).toBeVisible()
    
    // Should establish connection
    await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 10000 })
    
    // Should show microphone indicator
    await expect(page.getByTestId('mic-indicator')).toBeVisible()
    
    // Should show stop button
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible()
  })

  test('should display transcription and translation in real-time', async ({ page }) => {
    await page.goto('/app')
    
    // Setup language pair
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    // Start translation
    await page.getByRole('button', { name: /start/i }).click()
    
    // Wait for connection
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Should show transcription
    await expect(page.getByText('Hello, how are you?')).toBeVisible({ timeout: 5000 })
    
    // Should show translation
    await expect(page.getByText('Hola, ¿cómo estás?')).toBeVisible({ timeout: 3000 })
    
    // Should update latency metrics
    await expect(page.getByTestId('latency-display')).toContainText(/\d+ms/)
  })

  test('should handle connection failures gracefully', async ({ page }) => {
    // Mock ephemeral session failure
    await page.route('/api/ephemeral-session*', (route) => {
      route.fulfill({
        json: { error: 'Service temporarily unavailable' },
        status: 503
      })
    })

    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    
    // Should show error message
    await expect(page.getByText(/failed to connect/i)).toBeVisible()
    
    // Should return to ready state
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible()
  })

  test('should handle microphone permission denied', async ({ page }) => {
    // Revoke microphone permission
    await page.context().clearPermissions()
    
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    
    // Should show permission error
    await expect(page.getByText(/microphone permission/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /grant permission/i })).toBeVisible()
  })

  test('should auto-switch to PTT mode when WebRTC fails', async ({ page }) => {
    // Mock WebRTC failure
    await page.addInitScript(() => {
      window.RTCPeerConnection = class FailingRTCPeerConnection extends EventTarget {
        constructor() {
          super()
          setTimeout(() => {
            this.connectionState = 'failed'
            this.dispatchEvent(new Event('connectionstatechange'))
          }, 1000)
        }
        
        async createOffer() {
          throw new Error('WebRTC not supported')
        }
        
        createDataChannel() {
          return {
            label: 'test',
            readyState: 'closed',
            send: () => {},
            close: () => {},
          }
        }
        
        close() {}
      }
    })

    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    
    // Should attempt WebRTC first
    await expect(page.getByText(/connecting/i)).toBeVisible()
    
    // Should fallback to PTT mode
    await expect(page.getByText(/push to talk mode/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /hold to speak/i })).toBeVisible()
  })

  test('should work in PTT fallback mode', async ({ page }) => {
    // Mock PTT API
    await page.route('/api/ptt', (route) => {
      route.fulfill({
        body: new ArrayBuffer(8), // Mock audio data
        headers: {
          'Content-Type': 'audio/mp3',
          'X-Source-Text': btoa('Hello world'),
          'X-Target-Text': btoa('Hola mundo'),
          'X-Total-Latency': '850'
        }
      })
    })

    // Force PTT mode
    await page.goto('/app?mode=ptt')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    // Should show PTT interface
    const pttButton = page.getByRole('button', { name: /hold to speak/i })
    await expect(pttButton).toBeVisible()
    
    // Simulate holding button and speaking
    await pttButton.dispatchEvent('mousedown')
    
    // Should show recording state
    await expect(page.getByText(/recording/i)).toBeVisible()
    
    // Release button
    await pttButton.dispatchEvent('mouseup')
    
    // Should show processing
    await expect(page.getByText(/processing/i)).toBeVisible()
    
    // Should show results
    await expect(page.getByText('Hello world')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Hola mundo')).toBeVisible()
  })

  test('should meet latency requirements', async ({ page }) => {
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    const startTime = Date.now()
    
    await page.getByRole('button', { name: /start/i }).click()
    
    // Wait for connection
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Wait for first translation
    await expect(page.getByText('Hola, ¿cómo estás?')).toBeVisible()
    
    const endTime = Date.now()
    const totalLatency = endTime - startTime
    
    // Should meet < 700ms first audible translation requirement
    // (In real tests, this would be more complex with actual audio timing)
    expect(totalLatency).toBeLessThan(5000) // Generous for E2E test
    
    // Check displayed latency metrics
    const latencyDisplay = page.getByTestId('latency-display')
    const latencyText = await latencyDisplay.textContent()
    const displayedLatency = parseInt(latencyText?.match(/\d+/)?.[0] || '0')
    expect(displayedLatency).toBeLessThan(700)
  })

  test('should support multiple language pairs', async ({ page }) => {
    const languagePairs = [
      { source: 'en', target: 'es', sourceText: 'Hello', targetText: 'Hola' },
      { source: 'fr', target: 'de', sourceText: 'Bonjour', targetText: 'Hallo' },
      { source: 'ja', target: 'en', sourceText: 'こんにちは', targetText: 'Hello' },
    ]

    for (const pair of languagePairs) {
      // Mock different responses for different language pairs
      await page.route('/api/ephemeral-session*', (route) => {
        const url = new URL(route.request().url())
        const sourceLang = url.searchParams.get('source_lang')
        const targetLang = url.searchParams.get('target_lang')
        
        if (sourceLang === pair.source && targetLang === pair.target) {
          route.fulfill({
            json: {
              session_id: `session-${pair.source}-${pair.target}`,
              client_secret: { value: 'secret-123' },
            }
          })
        }
      })

      await page.goto('/app')
      
      await page.selectOption('[data-testid="source-language"]', pair.source)
      await page.selectOption('[data-testid="target-language"]', pair.target)
      
      await page.getByRole('button', { name: /start/i }).click()
      await expect(page.getByText(/connected/i)).toBeVisible()
      
      // Stop and clean up for next iteration
      await page.getByRole('button', { name: /stop/i }).click()
      await expect(page.getByRole('button', { name: /start/i })).toBeVisible()
    }
  })

  test('should handle session timeouts', async ({ page }) => {
    // Mock session that expires quickly
    await page.route('/api/ephemeral-session*', (route) => {
      route.fulfill({
        json: {
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
          expires_at: Date.now() + 1000, // Expires in 1 second
        }
      })
    })

    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Wait for session to expire
    await expect(page.getByText(/session expired/i)).toBeVisible({ timeout: 3000 })
    
    // Should return to ready state
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible()
  })

  test('should stop translation cleanly', async ({ page }) => {
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Stop translation
    await page.getByRole('button', { name: /stop/i }).click()
    
    // Should return to ready state
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible()
    await expect(page.getByText(/ready/i)).toBeVisible()
    
    // Should clear transcription and translation
    await expect(page.getByText('Hello, how are you?')).not.toBeVisible()
    await expect(page.getByText('Hola, ¿cómo estás?')).not.toBeVisible()
  })

  test('should work with different audio quality settings', async ({ page }) => {
    await page.goto('/app/settings')
    
    // Change audio quality
    await page.selectOption('[data-testid="audio-quality"]', 'high')
    
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    
    // Should work with high quality settings
    await expect(page.getByText(/connected/i)).toBeVisible()
  })
})

test.describe('Realtime Translation Performance', () => {
  test('should maintain stable connection during long sessions', async ({ page }) => {
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Wait for extended period
    await page.waitForTimeout(30000) // 30 seconds
    
    // Should still be connected
    await expect(page.getByText(/connected/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /stop/i })).toBeVisible()
  })

  test('should handle network interruptions', async ({ page }) => {
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).click()
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    // Simulate network interruption
    await page.context().setOffline(true)
    
    // Should detect disconnection
    await expect(page.getByText(/connection lost/i)).toBeVisible({ timeout: 10000 })
    
    // Restore network
    await page.context().setOffline(false)
    
    // Should attempt to reconnect
    await expect(page.getByText(/reconnecting/i)).toBeVisible()
    await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Mobile Realtime Translation', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/app')
    
    // Should display mobile-optimized UI
    await expect(page.getByTestId('mobile-translator')).toBeVisible()
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    // Start button should be touch-friendly
    const startButton = page.getByRole('button', { name: /start/i })
    const buttonBox = await startButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThan(44)
    
    await startButton.tap()
    
    // Should work with touch interactions
    await expect(page.getByText(/connected/i)).toBeVisible()
  })

  test('should handle mobile audio permissions', async ({ page }) => {
    // Test mobile-specific permission flows
    await page.goto('/app')
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).tap()
    
    // Should handle mobile permission dialogs
    await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 10000 })
  })

  test('should optimize for mobile performance', async ({ page }) => {
    await page.goto('/app')
    
    const startTime = performance.now()
    
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')
    
    await page.getByRole('button', { name: /start/i }).tap()
    await expect(page.getByText(/connected/i)).toBeVisible()
    
    const endTime = performance.now()
    const loadTime = endTime - startTime
    
    // Should be reasonably fast on mobile
    expect(loadTime).toBeLessThan(5000)
  })
})