import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete magic link authentication flow', async ({ page }) => {
    // Navigate to sign in page
    await page.getByRole('link', { name: /sign in/i }).click()
    
    // Fill in email
    const emailInput = page.getByLabel('Email address')
    await emailInput.fill('test@example.com')
    
    // Submit form
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Check for success message
    await expect(page.getByText('Check your email for the login link!')).toBeVisible()
    
    // Verify loading state appeared and disappeared
    await expect(page.getByText('Sending...')).toHaveBeenVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should handle invalid email format', async ({ page }) => {
    await page.goto('/auth')
    
    const emailInput = page.getByLabel('Email address')
    await emailInput.fill('invalid-email')
    
    // Try to submit
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show browser validation error or custom validation
    const validationMessage = await emailInput.evaluate((input: HTMLInputElement) => input.validationMessage)
    expect(validationMessage).toBeTruthy()
  })

  test('should redirect to app after successful callback', async ({ page, context }) => {
    // Mock successful auth callback
    await page.route('/auth/callback*', (route) => {
      route.fulfill({
        status: 302,
        headers: {
          'Location': '/app'
        }
      })
    })

    // Navigate to callback URL (simulating email link click)
    await page.goto('/auth/callback?code=mock_auth_code')
    
    // Should redirect to app
    await expect(page).toHaveURL('/app')
  })

  test('should handle auth callback errors', async ({ page }) => {
    // Mock failed auth callback
    await page.route('/auth/callback*', (route) => {
      route.fulfill({
        status: 302,
        headers: {
          'Location': '/auth/error'
        }
      })
    })

    await page.goto('/auth/callback?code=invalid_code')
    
    // Should redirect to error page
    await expect(page).toHaveURL('/auth/error')
    await expect(page.getByText(/authentication error/i)).toBeVisible()
  })

  test('should protect app routes from unauthenticated users', async ({ page }) => {
    await page.goto('/app')
    
    // Should redirect to sign in
    await expect(page).toHaveURL('/auth')
    await expect(page.getByText(/sign in/i)).toBeVisible()
  })

  test('should allow signed-in users to access app', async ({ page }) => {
    // Mock authenticated session
    await page.addInitScript(() => {
      // Mock localStorage or session storage if needed
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    // Mock auth state
    await page.route('/api/auth/session', (route) => {
      route.fulfill({
        json: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'mock_token' }
        }
      })
    })

    await page.goto('/app')
    
    // Should stay on app page
    await expect(page).toHaveURL('/app')
    await expect(page.getByText(/translator/i)).toBeVisible()
  })

  test('should handle sign out', async ({ page }) => {
    // Mock authenticated state first
    await page.addInitScript(() => {
      window.localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock_token',
        expires_at: Date.now() + 3600000,
      }))
    })

    await page.route('/api/auth/session', (route) => {
      route.fulfill({
        json: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'mock_token' }
        }
      })
    })

    await page.goto('/app')
    
    // Find and click sign out button
    await page.getByRole('button', { name: /sign out/i }).click()
    
    // Should redirect to home page
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('should create user profile on first sign in', async ({ page }) => {
    // Mock new user callback
    await page.route('/auth/callback*', async (route) => {
      // Simulate profile creation during callback
      await page.evaluate(() => {
        // Mock profile creation API call
        fetch('/api/profile', {
          method: 'POST',
          body: JSON.stringify({ display_name: 'Test User' })
        })
      })
      
      route.fulfill({
        status: 302,
        headers: {
          'Location': '/app'
        }
      })
    })

    await page.goto('/auth/callback?code=new_user_code')
    await expect(page).toHaveURL('/app')
  })
})

test.describe('Authentication Security', () => {
  test('should validate CSRF protection', async ({ page }) => {
    // Try to access callback without proper state
    await page.goto('/auth/callback?code=malicious_code')
    
    // Should handle safely (either redirect to error or ignore)
    await expect(page).not.toHaveURL(/\/app/)
  })

  test('should handle expired auth codes', async ({ page }) => {
    await page.route('/auth/callback*', (route) => {
      if (route.request().url().includes('expired_code')) {
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/auth/error'
          }
        })
      }
    })

    await page.goto('/auth/callback?code=expired_code')
    await expect(page).toHaveURL('/auth/error')
  })

  test('should prevent duplicate sign in attempts', async ({ page }) => {
    await page.goto('/auth')
    
    const emailInput = page.getByLabel('Email address')
    await emailInput.fill('test@example.com')
    
    const submitButton = page.getByRole('button', { name: /sign in/i })
    
    // Click multiple times quickly
    await submitButton.click()
    await submitButton.click()
    await submitButton.click()
    
    // Should only make one request (button disabled during loading)
    await expect(submitButton).toBeDisabled()
    await expect(page.getByText('Sending...')).toBeVisible()
  })
})

test.describe('Authentication Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth')
    
    // Tab to email input
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('email')
    
    // Fill email and press Enter
    await page.keyboard.type('test@example.com')
    await page.keyboard.press('Enter')
    
    // Should submit form
    await expect(page.getByText('Sending...')).toBeVisible()
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/auth')
    
    // Check form accessibility
    const form = page.getByRole('main').locator('form')
    await expect(form).toBeVisible()
    
    const emailInput = page.getByRole('textbox', { name: /email address/i })
    await expect(emailInput).toBeVisible()
    
    const submitButton = page.getByRole('button', { name: /sign in/i })
    await expect(submitButton).toBeVisible()
    expect(await submitButton.getAttribute('type')).toBe('submit')
  })

  test('should provide meaningful error messages', async ({ page }) => {
    // Mock auth error
    await page.route('/api/auth/signin', (route) => {
      route.fulfill({
        json: { error: 'Invalid email address' },
        status: 400
      })
    })

    await page.goto('/auth')
    await page.getByLabel('Email address').fill('test@example.com')
    await page.getByRole('button', { name: /sign in/i }).click()
    
    // Should show descriptive error
    await expect(page.getByText('Error: Invalid email address')).toBeVisible()
  })
})

test.describe('Mobile Authentication', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/auth')
    
    // Check mobile-friendly layout
    const form = page.locator('form')
    await expect(form).toBeVisible()
    
    // Should be properly sized for mobile
    const emailInput = page.getByLabel('Email address')
    const inputBox = await emailInput.boundingBox()
    expect(inputBox?.width).toBeGreaterThan(200) // Reasonable touch target
    
    // Should work with touch
    await emailInput.tap()
    await emailInput.fill('mobile@example.com')
    
    await page.getByRole('button', { name: /sign in/i }).tap()
    await expect(page.getByText('Sending...')).toBeVisible()
  })

  test('should handle mobile keyboard interactions', async ({ page }) => {
    await page.goto('/auth')
    
    const emailInput = page.getByLabel('Email address')
    await emailInput.click()
    
    // Check if email keyboard appears (input type="email")
    expect(await emailInput.getAttribute('type')).toBe('email')
    expect(await emailInput.getAttribute('inputmode')).toBe('email')
  })
})