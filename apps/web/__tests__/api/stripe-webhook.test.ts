import { POST } from '@/app/api/stripe-webhook/route'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

// Mock dependencies
const mockStripeWebhooks = {
  constructEvent: jest.fn(),
}

const mockSupabaseAdmin = {
  from: jest.fn(() => ({
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ error: null })),
    })),
  })),
}

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    webhooks: mockStripeWebhooks,
  },
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseAdmin,
}))

describe('/api/stripe-webhook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock environment variables
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE = 'service_role_key'
  })

  describe('POST', () => {
    it('should handle subscription created event', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)

      // Verify profile was updated to pro plan
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith('profiles')
      const updateCall = mockSupabaseAdmin.from().update
      expect(updateCall).toHaveBeenCalledWith({
        plan: 'pro',
        updated_at: expect.any(String),
      })
    })

    it('should handle subscription updated event', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(mockSupabaseAdmin.from().update).toHaveBeenCalledWith({
        plan: 'pro',
        updated_at: expect.any(String),
      })
    })

    it('should handle subscription deleted event', async () => {
      const mockEvent = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify profile was downgraded to free plan
      expect(mockSupabaseAdmin.from().update).toHaveBeenCalledWith({
        plan: 'free',
        updated_at: expect.any(String),
      })
    })

    it('should handle invoice payment succeeded event', async () => {
      const mockEvent = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Should not update any profiles for payment events
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('should handle invoice payment failed event', async () => {
      const mockEvent = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_123',
            customer: 'cus_123',
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should return 400 when no signature is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: 'test body',
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No signature')
    })

    it('should return 400 when signature verification fails', async () => {
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: 'test body',
        headers: {
          'stripe-signature': 'invalid_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid signature')
    })

    it('should handle subscription without supabase_user_id metadata', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            metadata: {}, // No supabase_user_id
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Should not update any profiles when user_id is missing
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled()
    })

    it('should handle database errors gracefully', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'active',
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      // Mock database error
      mockSupabaseAdmin.from.mockImplementation(() => ({
        update: () => ({
          eq: () => Promise.resolve({ error: { message: 'Database error' } }),
        }),
      }))

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200) // Still returns success to prevent retries
    })

    it('should handle unknown event types', async () => {
      const mockEvent = {
        type: 'customer.created', // Unknown event type for our webhook
        data: {
          object: {
            id: 'cus_123',
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle inactive subscription status', async () => {
      const mockEvent = {
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
            status: 'canceled', // Inactive status
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
        },
      }

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'mock_signature',
          'content-type': 'application/json',
        },
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Should still update to free plan for inactive subscription
      expect(mockSupabaseAdmin.from().update).toHaveBeenCalledWith({
        plan: 'free',
        updated_at: expect.any(String),
      })
    })
  })

  describe('Security', () => {
    it('should validate webhook signature', async () => {
      const mockEvent = {
        type: 'customer.subscription.created',
        data: { object: {} },
      }

      const request = new NextRequest('http://localhost:3000/api/stripe-webhook', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: {
          'stripe-signature': 'valid_signature',
          'content-type': 'application/json',
        },
      })

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent)

      await POST(request)

      expect(mockStripeWebhooks.constructEvent).toHaveBeenCalledWith(
        JSON.stringify(mockEvent),
        'valid_signature',
        'whsec_test_secret'
      )
    })
  })
})