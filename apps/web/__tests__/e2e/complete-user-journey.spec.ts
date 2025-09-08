/**
 * Complete User Journey E2E Tests
 * Tests the entire user experience from authentication to translation
 * and billing across different scenarios
 */

import { test, expect } from '@playwright/test'

test.describe('Complete User Journey E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Mock Stripe for billing tests
    await page.route('/api/checkout', (route) => {
      route.fulfill({
        json: { url: 'https://checkout.stripe.com/pay/cs_test_123' }
      })
    })

    await page.route('/api/stripe-webhook', (route) => {
      route.fulfill({ json: { received: true } })
    })

    // Mock Supabase API endpoints
    await page.route('**/auth/v1/token*', (route) => {
      route.fulfill({
        json: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            created_at: new Date().toISOString(),
          }
        }
      })
    })

    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          email: 'test@example.com',
          plan: 'free',
          created_at: new Date().toISOString(),
        }
      })
    })
  })

  test('New user complete onboarding and first translation', async ({ page }) => {
    // 1. Landing page visit
    await page.goto('/')
    
    await expect(page.getByRole('heading', { name: /Live Translator/i })).toBeVisible()
    await expect(page.getByText(/Real-time voice translation/i)).toBeVisible()

    // 2. Navigate to sign up
    await page.getByRole('link', { name: /get started/i }).click()
    await expect(page).toHaveURL('/auth')

    // 3. Sign up with email
    await page.getByLabel(/email/i).fill('test@example.com')
    await page.getByRole('button', { name: /sign up/i }).click()

    await expect(page.getByText(/check your email/i)).toBeVisible()

    // 4. Simulate email verification (magic link)
    await page.goto('/auth/callback?access_token=mock_access_token&refresh_token=mock_refresh_token&type=signup')
    
    // Should redirect to app
    await expect(page).toHaveURL('/app')

    // 5. First-time setup wizard
    await expect(page.getByText(/welcome to live translator/i)).toBeVisible()
    
    // Skip tutorial for now
    await page.getByRole('button', { name: /skip tutorial/i }).click()

    // 6. First translation attempt
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')

    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])

    // Mock successful realtime connection
    await page.route('/api/ephemeral-session*', (route) => {
      route.fulfill({
        json: {
          session_id: 'session-123',
          client_secret: { value: 'secret-123' },
        }
      })
    })

    await page.addInitScript(() => {
      // Mock WebRTC success
      window.RTCPeerConnection = class MockRTCPeerConnection extends EventTarget {
        connectionState = 'new'
        
        async createOffer() {
          return { type: 'offer', sdp: 'mock-sdp' }
        }
        
        async setLocalDescription(desc) {
          this.localDescription = desc
        }
        
        async setRemoteDescription(desc) {
          this.remoteDescription = desc
          setTimeout(() => {
            this.connectionState = 'connected'
            this.dispatchEvent(new Event('connectionstatechange'))
          }, 500)
        }
        
        createDataChannel(label) {
          const channel = {
            label,
            readyState: 'open',
            send: () => {},
            close: () => {},
          }
          
          // Simulate first translation
          setTimeout(() => {
            if (channel.onmessage) {
              channel.onmessage({
                data: JSON.stringify({
                  type: 'translation',
                  text: 'Hola, bienvenido',
                  is_final: true
                })
              })
            }
          }, 1500)
          
          return channel
        }
        
        close() {}
      }

      navigator.mediaDevices.getUserMedia = () => Promise.resolve({
        getTracks: () => [{ stop: () => {} }],
        getAudioTracks: () => [{ stop: () => {} }]
      })
    })

    await page.getByRole('button', { name: /start translation/i }).click()

    // Should show connecting state
    await expect(page.getByText(/connecting/i)).toBeVisible()

    // Should establish connection
    await expect(page.getByText(/connected/i)).toBeVisible({ timeout: 5000 })

    // Should show first translation
    await expect(page.getByText('Hola, bienvenido')).toBeVisible({ timeout: 3000 })

    // 7. Success celebration
    await expect(page.getByText(/great job/i)).toBeVisible()
    await expect(page.getByText(/first translation complete/i)).toBeVisible()
  })

  test('Free user hits usage limit and upgrades to Pro', async ({ page }) => {
    // 1. Start as authenticated free user
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    // Mock free user profile with high usage
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          email: 'test@example.com',
          plan: 'free',
          usage_count: 485, // Close to 500 limit
          usage_limit: 500,
          created_at: new Date().toISOString(),
        }
      })
    })

    await page.goto('/app')

    // 2. Should show usage warning
    await expect(page.getByText(/15 translations remaining/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade to pro/i })).toBeVisible()

    // 3. Continue using until limit
    for (let i = 0; i < 15; i++) {
      // Mock translation usage
      await page.route('/api/ptt', (route) => {
        route.fulfill({
          body: new ArrayBuffer(8),
          headers: {
            'Content-Type': 'audio/mp3',
            'X-Source-Text': btoa(`Translation ${i + 1}`),
            'X-Target-Text': btoa(`Traducción ${i + 1}`),
          }
        })
      })
    }

    // 4. Hit the limit
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          email: 'test@example.com',
          plan: 'free',
          usage_count: 500, // At limit
          usage_limit: 500,
        }
      })
    })

    await page.reload()

    // 5. Should block usage
    await expect(page.getByText(/usage limit reached/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /start translation/i })).toBeDisabled()

    // 6. Click upgrade to Pro
    await page.getByRole('button', { name: /upgrade to pro/i }).click()

    // Should navigate to billing page
    await expect(page).toHaveURL('/app/billing')
    await expect(page.getByText(/choose your plan/i)).toBeVisible()

    // 7. Select Pro plan
    await page.getByRole('button', { name: /choose pro/i }).click()

    // Should redirect to Stripe
    await expect(page).toHaveURL(/stripe\.com/)

    // 8. Simulate successful payment (return from Stripe)
    await page.route('**/rest/v1/profiles*', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          email: 'test@example.com',
          plan: 'pro',
          usage_count: 500,
          usage_limit: -1, // Unlimited
        }
      })
    })

    await page.goto('/app?success=true')

    // 9. Should show Pro benefits
    await expect(page.getByText(/welcome to pro/i)).toBeVisible()
    await expect(page.getByText(/unlimited translations/i)).toBeVisible()

    // 10. Translation should work again
    await expect(page.getByRole('button', { name: /start translation/i })).not.toBeDisabled()
  })

  test('User encounters technical issues and uses support', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    await page.goto('/app')

    // 1. Attempt translation but encounter WebRTC error
    await page.addInitScript(() => {
      window.RTCPeerConnection = class FailingRTCPeerConnection {
        constructor() {
          throw new Error('WebRTC not supported in this browser')
        }
      }
    })

    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')

    await page.getByRole('button', { name: /start translation/i }).click()

    // 2. Should show error and fallback options
    await expect(page.getByText(/webrtc connection failed/i)).toBeVisible()
    await expect(page.getByText(/switched to push-to-talk mode/i)).toBeVisible()

    // 3. User opens help/support
    await page.getByRole('button', { name: /help/i }).click()

    await expect(page.getByText(/troubleshooting guide/i)).toBeVisible()
    await expect(page.getByText(/common issues/i)).toBeVisible()

    // 4. Check browser compatibility
    await page.getByRole('button', { name: /check compatibility/i }).click()

    await expect(page.getByText(/browser compatibility report/i)).toBeVisible()
    await expect(page.getByText(/webrtc: not supported/i)).toBeVisible()
    await expect(page.getByText(/mediadevices: supported/i)).toBeVisible()

    // 5. Try suggested fix - use PTT mode
    await page.getByRole('button', { name: /try ptt mode/i }).click()

    // Mock PTT success
    await page.route('/api/ptt', (route) => {
      route.fulfill({
        body: new ArrayBuffer(8),
        headers: {
          'Content-Type': 'audio/mp3',
          'X-Source-Text': btoa('This works now'),
          'X-Target-Text': btoa('Esto funciona ahora'),
        }
      })
    })

    // 6. PTT should work
    const pttButton = page.getByRole('button', { name: /hold to speak/i })
    await expect(pttButton).toBeVisible()

    await pttButton.dispatchEvent('mousedown')
    await page.waitForTimeout(1000)
    await pttButton.dispatchEvent('mouseup')

    await expect(page.getByText('This works now')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Esto funciona ahora')).toBeVisible()

    // 7. Success feedback
    await expect(page.getByText(/ptt mode working correctly/i)).toBeVisible()
  })

  test('User manages translation history and exports data', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    // Mock user with some translation history
    const mockTranslations = [
      {
        id: '1',
        original: 'Hello, how are you?',
        translated: 'Hola, ¿cómo estás?',
        source_language: 'en',
        target_language: 'es',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        latency_ms: 650,
      },
      {
        id: '2',
        original: 'Good morning',
        translated: 'Buenos días',
        source_language: 'en',
        target_language: 'es',
        timestamp: new Date().toISOString(),
        latency_ms: 580,
      },
    ]

    await page.route('**/rest/v1/translations*', (route) => {
      route.fulfill({ json: mockTranslations })
    })

    await page.goto('/app/history')

    // 1. View translation history
    await expect(page.getByText(/translation history/i)).toBeVisible()
    await expect(page.getByText('Hello, how are you?')).toBeVisible()
    await expect(page.getByText('Hola, ¿cómo estás?')).toBeVisible()
    await expect(page.getByText('Good morning')).toBeVisible()
    await expect(page.getByText('Buenos días')).toBeVisible()

    // 2. Filter by date range
    await page.getByLabel(/from date/i).fill('2024-01-01')
    await page.getByLabel(/to date/i).fill('2024-12-31')
    await page.getByRole('button', { name: /apply filter/i }).click()

    // Should still show filtered results
    await expect(page.getByText('Hello, how are you?')).toBeVisible()

    // 3. Search translations
    await page.getByPlaceholder(/search translations/i).fill('morning')
    await expect(page.getByText('Good morning')).toBeVisible()
    await expect(page.getByText('Hello, how are you?')).not.toBeVisible()

    // Clear search
    await page.getByPlaceholder(/search translations/i).clear()

    // 4. Export data
    await page.getByRole('button', { name: /export/i }).click()

    // Select export format
    await page.getByLabel(/export format/i).selectOption('json')
    await page.getByRole('button', { name: /download/i }).click()

    // Should trigger download (we can't test actual file download in E2E easily)
    await expect(page.getByText(/export started/i)).toBeVisible()

    // 5. Delete specific translation
    const firstTranslation = page.getByTestId('translation-item').first()
    await firstTranslation.getByRole('button', { name: /delete/i }).click()

    // Confirm deletion
    await page.getByRole('button', { name: /confirm delete/i }).click()

    await expect(page.getByText(/translation deleted/i)).toBeVisible()

    // 6. Privacy settings
    await page.getByRole('button', { name: /privacy settings/i }).click()

    await expect(page.getByText(/history settings/i)).toBeVisible()
    
    // Disable history saving
    await page.getByLabel(/save translation history/i).uncheck()
    await page.getByRole('button', { name: /save settings/i }).click()

    await expect(page.getByText(/privacy settings updated/i)).toBeVisible()

    // 7. Clear all history
    await page.getByRole('button', { name: /clear all history/i }).click()

    // Confirm with password or additional verification
    await page.getByLabel(/confirm action/i).fill('delete all history')
    await page.getByRole('button', { name: /permanently delete/i }).click()

    await expect(page.getByText(/all history cleared/i)).toBeVisible()
    await expect(page.getByText(/no translations found/i)).toBeVisible()
  })

  test('User tests app across different devices and browsers', async ({ page, context, browserName }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    // Test responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
    ]

    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/app')

      // UI should adapt to different screen sizes
      await expect(page.getByRole('main')).toBeVisible()
      
      if (viewport.name === 'Mobile') {
        // Mobile-specific tests
        await expect(page.getByTestId('mobile-navigation')).toBeVisible()
        
        // Check touch-friendly button sizes
        const startButton = page.getByRole('button', { name: /start translation/i })
        const buttonBox = await startButton.boundingBox()
        expect(buttonBox?.height).toBeGreaterThan(44) // Minimum touch target
      }

      if (viewport.name === 'Desktop') {
        // Desktop-specific tests
        await expect(page.getByTestId('sidebar-navigation')).toBeVisible()
        await expect(page.getByText(/keyboard shortcuts/i)).toBeVisible()
      }
    }

    // Browser-specific feature detection
    const capabilities = await page.evaluate(() => ({
      webRTC: !!window.RTCPeerConnection,
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      mediaRecorder: !!window.MediaRecorder,
    }))

    // Log capabilities for debugging
    console.log(`Browser: ${browserName}, Capabilities:`, capabilities)

    // Adapt functionality based on capabilities
    if (capabilities.webRTC && capabilities.getUserMedia) {
      await page.selectOption('[data-testid="source-language"]', 'en')
      await page.selectOption('[data-testid="target-language"]', 'es')
      
      await page.getByRole('button', { name: /start translation/i }).click()
      
      // Should attempt realtime mode
      await expect(page.getByText(/connecting/i)).toBeVisible()
    } else {
      // Should show compatibility warning
      await expect(page.getByText(/limited compatibility/i)).toBeVisible()
      await expect(page.getByText(/ptt mode recommended/i)).toBeVisible()
    }

    // Test keyboard accessibility (desktop only)
    if (viewport.name === 'Desktop') {
      // Tab navigation
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Should be able to navigate to start button
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
      
      // Enter key should activate button
      await page.keyboard.press('Enter')
    }
  })

  test('User participates in performance monitoring and feedback', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    await page.goto('/app')

    // 1. Enable performance monitoring
    await page.getByRole('button', { name: /settings/i }).click()
    await page.getByLabel(/enable performance monitoring/i).check()
    await page.getByRole('button', { name: /save settings/i }).click()

    // 2. Use translation service
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')

    // Mock performance data collection
    await page.route('/api/analytics/performance', (route) => {
      route.fulfill({ json: { recorded: true } })
    })

    await page.getByRole('button', { name: /start translation/i }).click()

    // Should show performance metrics in real-time
    await expect(page.getByTestId('performance-metrics')).toBeVisible()
    await expect(page.getByText(/connection latency/i)).toBeVisible()
    await expect(page.getByText(/translation speed/i)).toBeVisible()

    // 3. Performance issues trigger feedback prompt
    await page.evaluate(() => {
      // Simulate poor performance
      window.dispatchEvent(new CustomEvent('performance-issue', {
        detail: { type: 'high-latency', value: 2500 }
      }))
    })

    await expect(page.getByText(/experiencing issues/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /report issue/i })).toBeVisible()

    // 4. Submit feedback
    await page.getByRole('button', { name: /report issue/i }).click()

    await page.getByLabel(/describe the issue/i).fill('Translation taking too long')
    await page.getByLabel(/audio quality/i).selectOption('poor')
    await page.getByLabel(/connection stability/i).selectOption('unstable')

    await page.getByRole('button', { name: /submit feedback/i }).click()

    await expect(page.getByText(/thank you for your feedback/i)).toBeVisible()

    // 5. View performance dashboard
    await page.goto('/app/performance')

    await expect(page.getByText(/performance dashboard/i)).toBeVisible()
    await expect(page.getByText(/average latency/i)).toBeVisible()
    await expect(page.getByText(/connection success rate/i)).toBeVisible()
    await expect(page.getByText(/audio quality score/i)).toBeVisible()

    // Should show historical performance data
    await expect(page.getByRole('img', { name: /performance chart/i })).toBeVisible()

    // 6. Performance optimization suggestions
    await expect(page.getByText(/optimization tips/i)).toBeVisible()
    await expect(page.getByText(/improve connection/i)).toBeVisible()
    await expect(page.getByText(/audio settings/i)).toBeVisible()
  })

  test('User completes satisfaction survey after successful session', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    await page.goto('/app')

    // 1. Complete successful translation session
    await page.selectOption('[data-testid="source-language"]', 'en')
    await page.selectOption('[data-testid="target-language"]', 'es')

    // Mock successful session
    let translationCount = 0
    await page.route('/api/ptt', (route) => {
      translationCount++
      route.fulfill({
        body: new ArrayBuffer(8),
        headers: {
          'Content-Type': 'audio/mp3',
          'X-Source-Text': btoa(`Translation ${translationCount}`),
          'X-Target-Text': btoa(`Traducción ${translationCount}`),
          'X-Total-Latency': '550'
        }
      })
    })

    // Simulate a productive session with multiple translations
    const pttButton = page.getByRole('button', { name: /hold to speak/i })
    
    for (let i = 0; i < 5; i++) {
      await pttButton.dispatchEvent('mousedown')
      await page.waitForTimeout(1000)
      await pttButton.dispatchEvent('mouseup')
      await page.waitForTimeout(2000) // Wait for translation
    }

    // 2. End session
    await page.getByRole('button', { name: /end session/i }).click()

    // 3. Post-session survey should appear
    await expect(page.getByText(/how was your experience/i)).toBeVisible()
    await expect(page.getByText(/quick feedback/i)).toBeVisible()

    // Rate overall experience
    await page.getByLabel(/overall rating/i).click()
    await page.getByRole('button', { name: /5 stars/i }).click()

    // Rate specific aspects
    await page.getByLabel(/translation quality/i).click()
    await page.getByRole('button', { name: /4 stars/i }).click()

    await page.getByLabel(/speed/i).click()
    await page.getByRole('button', { name: /5 stars/i }).click()

    await page.getByLabel(/ease of use/i).click()
    await page.getByRole('button', { name: /5 stars/i }).click()

    // Optional feedback
    await page.getByLabel(/additional comments/i).fill('Great app! Very helpful for my travels.')

    // 4. Submit survey
    await page.getByRole('button', { name: /submit feedback/i }).click()

    await expect(page.getByText(/thank you for your feedback/i)).toBeVisible()

    // 5. Offer to share or rate app
    await expect(page.getByText(/enjoying live translator/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /rate on app store/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /share with friends/i })).toBeVisible()

    // 6. Follow-up engagement
    await page.getByRole('button', { name: /share with friends/i }).click()
    
    await expect(page.getByText(/share live translator/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /copy link/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /share on social/i })).toBeVisible()

    // Copy referral link
    await page.getByRole('button', { name: /copy link/i }).click()
    await expect(page.getByText(/link copied/i)).toBeVisible()

    // Check referral analytics
    await page.goto('/app/referrals')
    await expect(page.getByText(/referral program/i)).toBeVisible()
    await expect(page.getByText(/share and earn/i)).toBeVisible()
  })
})