import { test, expect } from '@playwright/test'

test.describe('Stripe Billing Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user
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
  })

  test('should display billing page with current plan', async ({ page }) => {
    // Mock user profile with free plan
    await page.route('/api/profile', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          plan: 'free',
          display_name: 'Test User'
        }
      })
    })

    await page.goto('/app/billing')
    
    // Should show current plan
    await expect(page.getByText('Current Plan')).toBeVisible()
    await expect(page.getByText('Free')).toBeVisible()
    
    // Should show upgrade options
    await expect(page.getByText('Pro Plan')).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible()
  })

  test('should initiate Stripe checkout for Pro plan', async ({ page }) => {
    // Mock checkout session creation
    await page.route('/api/checkout', (route) => {
      expect(route.request().method()).toBe('POST')
      route.fulfill({
        json: {
          url: 'https://checkout.stripe.com/pay/session-123'
        }
      })
    })

    await page.goto('/app/billing')
    
    // Click upgrade button
    await page.getByRole('button', { name: /upgrade to pro/i }).click()
    
    // Should redirect to Stripe checkout
    await expect(page).toHaveURL(/checkout\.stripe\.com/)
  })

  test('should handle checkout errors gracefully', async ({ page }) => {
    // Mock checkout API error
    await page.route('/api/checkout', (route) => {
      route.fulfill({
        json: { error: 'Payment processing unavailable' },
        status: 503
      })
    })

    await page.goto('/app/billing')
    
    await page.getByRole('button', { name: /upgrade to pro/i }).click()
    
    // Should show error message
    await expect(page.getByText(/payment processing unavailable/i)).toBeVisible()
    await expect(page).toHaveURL('/app/billing') // Should stay on billing page
  })

  test('should show customer portal for Pro users', async ({ page }) => {
    // Mock Pro user
    await page.route('/api/profile', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          plan: 'pro',
          display_name: 'Test User'
        }
      })
    })

    // Mock customer portal URL
    await page.route('/api/customer-portal', (route) => {
      route.fulfill({
        json: {
          url: 'https://billing.stripe.com/p/session/session-123'
        }
      })
    })

    await page.goto('/app/billing')
    
    // Should show Pro plan status
    await expect(page.getByText('Pro')).toBeVisible()
    
    // Should show manage billing button
    const manageBillingButton = page.getByRole('button', { name: /manage billing/i })
    await expect(manageBillingButton).toBeVisible()
    
    await manageBillingButton.click()
    
    // Should redirect to Stripe customer portal
    await expect(page).toHaveURL(/billing\.stripe\.com/)
  })

  test('should handle successful upgrade callback', async ({ page }) => {
    await page.goto('/app/billing?success=true')
    
    // Should show success message
    await expect(page.getByText(/upgrade successful/i)).toBeVisible()
    await expect(page.getByText(/welcome to pro/i)).toBeVisible()
  })

  test('should handle cancelled checkout', async ({ page }) => {
    await page.goto('/app/billing?canceled=true')
    
    // Should show cancellation message
    await expect(page.getByText(/checkout cancelled/i)).toBeVisible()
    
    // Should still show upgrade option
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible()
  })

  test('should display Pro plan features correctly', async ({ page }) => {
    await page.goto('/app/billing')
    
    // Check Pro plan features
    await expect(page.getByText('Unlimited translations')).toBeVisible()
    await expect(page.getByText('Priority support')).toBeVisible()
    await expect(page.getByText('Advanced features')).toBeVisible()
    
    // Check pricing
    await expect(page.getByText(/\$\d+\/month/)).toBeVisible()
  })

  test('should prevent multiple simultaneous checkouts', async ({ page }) => {
    let checkoutCallCount = 0
    
    await page.route('/api/checkout', (route) => {
      checkoutCallCount++
      // Simulate slow response
      setTimeout(() => {
        route.fulfill({
          json: {
            url: 'https://checkout.stripe.com/pay/session-123'
          }
        })
      }, 1000)
    })

    await page.goto('/app/billing')
    
    const upgradeButton = page.getByRole('button', { name: /upgrade to pro/i })
    
    // Click multiple times quickly
    await upgradeButton.click()
    await upgradeButton.click()
    await upgradeButton.click()
    
    // Should show loading state
    await expect(upgradeButton).toContainText(/processing/i)
    await expect(upgradeButton).toBeDisabled()
    
    // Should only make one API call
    await page.waitForTimeout(1500)
    expect(checkoutCallCount).toBe(1)
  })
})

test.describe('Webhook Processing', () => {
  test('should handle subscription created webhook', async ({ page }) => {
    // This would typically be tested in integration/API tests
    // But we can test the UI response to plan changes
    
    // Mock user starting with free plan
    let userPlan = 'free'
    
    await page.route('/api/profile', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          plan: userPlan,
          display_name: 'Test User'
        }
      })
    })

    await page.goto('/app/billing')
    await expect(page.getByText('Free')).toBeVisible()
    
    // Simulate webhook processing (plan upgrade)
    userPlan = 'pro'
    
    // Refresh page to see updated plan
    await page.reload()
    await expect(page.getByText('Pro')).toBeVisible()
    await expect(page.getByRole('button', { name: /manage billing/i })).toBeVisible()
  })

  test('should handle subscription cancellation', async ({ page }) => {
    // Mock Pro user initially
    let userPlan = 'pro'
    
    await page.route('/api/profile', (route) => {
      route.fulfill({
        json: {
          id: 'user-123',
          plan: userPlan,
          display_name: 'Test User'
        }
      })
    })

    await page.goto('/app/billing')
    await expect(page.getByText('Pro')).toBeVisible()
    
    // Simulate webhook processing (cancellation)
    userPlan = 'free'
    
    // Refresh to see downgrade
    await page.reload()
    await expect(page.getByText('Free')).toBeVisible()
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible()
  })
})

test.describe('Billing Security', () => {
  test('should require authentication for billing pages', async ({ page }) => {
    // Clear auth
    await page.addInitScript(() => {
      window.localStorage.clear()
    })

    await page.goto('/app/billing')
    
    // Should redirect to auth
    await expect(page).toHaveURL('/auth')
  })

  test('should validate checkout requests', async ({ page }) => {
    await page.route('/api/checkout', (route) => {
      const postData = route.request().postDataJSON()
      
      // Should include required fields
      expect(postData).toHaveProperty('priceId')
      
      route.fulfill({
        json: {
          url: 'https://checkout.stripe.com/pay/session-123'
        }
      })
    })

    await page.goto('/app/billing')
    await page.getByRole('button', { name: /upgrade to pro/i }).click()
  })

  test('should handle unauthorized billing operations', async ({ page }) => {
    // Mock unauthorized response
    await page.route('/api/checkout', (route) => {
      route.fulfill({
        json: { error: 'Unauthorized' },
        status: 401
      })
    })

    await page.goto('/app/billing')
    await page.getByRole('button', { name: /upgrade to pro/i }).click()
    
    // Should handle gracefully
    await expect(page.getByText(/unauthorized/i)).toBeVisible()
  })
})

test.describe('Billing Accessibility', () => {
  test('should be screen reader friendly', async ({ page }) => {
    await page.goto('/app/billing')
    
    // Check heading structure
    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /current plan/i })).toBeVisible()
    
    // Check button accessibility
    const upgradeButton = page.getByRole('button', { name: /upgrade/i })
    await expect(upgradeButton).toBeVisible()
    
    // Should have proper ARIA attributes
    expect(await upgradeButton.getAttribute('type')).toBe('button')
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/app/billing')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('BUTTON')
    
    // Should be able to activate with keyboard
    await page.keyboard.press('Enter')
    // Should trigger checkout process
  })

  test('should provide clear pricing information', async ({ page }) => {
    await page.goto('/app/billing')
    
    // Should clearly show what's included in each plan
    await expect(page.getByText('Free Plan')).toBeVisible()
    await expect(page.getByText('Pro Plan')).toBeVisible()
    
    // Should show pricing clearly
    await expect(page.getByText(/\$\d+/)).toBeVisible()
    
    // Should show what happens after upgrade
    await expect(page.getByText(/billed monthly/i)).toBeVisible()
  })
})

test.describe('Mobile Billing Experience', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/app/billing')
    
    // Should display properly on mobile
    await expect(page.getByText('Current Plan')).toBeVisible()
    
    // Upgrade button should be touch-friendly
    const upgradeButton = page.getByRole('button', { name: /upgrade/i })
    const buttonBox = await upgradeButton.boundingBox()
    expect(buttonBox?.height).toBeGreaterThan(44) // iOS touch target minimum
    
    await upgradeButton.tap()
    // Should work with touch
  })

  test('should handle mobile Stripe checkout', async ({ page }) => {
    await page.route('/api/checkout', (route) => {
      route.fulfill({
        json: {
          url: 'https://checkout.stripe.com/pay/session-mobile-123'
        }
      })
    })

    await page.goto('/app/billing')
    await page.getByRole('button', { name: /upgrade/i }).tap()
    
    // Should work on mobile browsers
    await expect(page).toHaveURL(/checkout\.stripe\.com/)
  })
})