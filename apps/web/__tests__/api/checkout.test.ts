import { POST } from '@/app/api/checkout/route'
import { NextRequest } from 'next/server'
import { mockSupabaseClient } from '../utils/mocks'

// Mock dependencies
const mockStripe = {
  customers: {
    retrieve: jest.fn(),
    create: jest.fn(),
  },
  checkout: {
    sessions: {
      create: jest.fn(),
    },
  },
}

jest.mock('@/lib/stripe/server', () => ({
  stripe: mockStripe,
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('/api/checkout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.APP_BASE_URL = 'https://app.example.com'

    // Setup default authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user-123', 
          email: 'test@example.com' 
        } 
      },
      error: null,
    })

    // Setup default profile query
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })
  })

  describe('POST', () => {
    it('should create checkout session for new customer', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      }

      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session-123',
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
          successUrl: 'https://app.example.com/success',
          cancelUrl: 'https://app.example.com/cancel',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: {
          supabase_user_id: 'user-123',
        },
      })

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        payment_method_types: ['card'],
        billing_address_collection: 'required',
        line_items: [
          {
            price: 'price_123',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://app.example.com/success',
        cancel_url: 'https://app.example.com/cancel',
        subscription_data: {
          metadata: {
            supabase_user_id: 'user-123',
          },
        },
        metadata: {
          supabase_user_id: 'user-123',
        },
      })
    })

    it('should use existing customer when stripe_customer_id is found', async () => {
      const mockProfile = {
        id: 'user-123',
        stripe_customer_id: 'cus_existing',
        plan: 'free',
      }

      const mockCustomer = {
        id: 'cus_existing',
        email: 'test@example.com',
      }

      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session-123',
      }

      // Mock profile with existing customer ID
      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockStripe.customers.retrieve.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')

      expect(mockStripe.customers.retrieve).toHaveBeenCalledWith('cus_existing')
      expect(mockStripe.customers.create).not.toHaveBeenCalled()
    })

    it('should use default URLs when not provided', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      }

      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session-123',
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      await POST(request)

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: 'https://app.example.com/app?success=true',
          cancel_url: 'https://app.example.com/app/billing?canceled=true',
        })
      )
    })

    it('should return 400 when priceId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Price ID is required')
    })

    it('should return 401 for unauthenticated user', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should handle Stripe customer creation errors', async () => {
      mockStripe.customers.create.mockRejectedValue(
        new Error('Stripe customer creation failed')
      )

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle Stripe checkout session creation errors', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockRejectedValue(
        new Error('Stripe checkout session creation failed')
      )

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle existing customer retrieval errors', async () => {
      const mockProfile = {
        id: 'user-123',
        stripe_customer_id: 'cus_nonexistent',
        plan: 'free',
      }

      mockSupabaseClient.from().single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      mockStripe.customers.retrieve.mockRejectedValue(
        new Error('Customer not found')
      )

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle Supabase auth errors', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should handle Supabase profile query errors', async () => {
      mockSupabaseClient.from().single.mockResolvedValue({
        data: null,
        error: { message: 'Profile not found' },
      })

      // Should still try to create a new customer despite profile error
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      }

      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session-123',
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_123',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      expect(mockStripe.customers.create).toHaveBeenCalled()
    })

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('Integration with billing workflow', () => {
    it('should create subscription with correct metadata for webhook processing', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      }

      const mockSession = {
        id: 'cs_123',
        url: 'https://checkout.stripe.com/session-123',
      }

      mockStripe.customers.create.mockResolvedValue(mockCustomer)
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      const request = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          priceId: 'price_pro_monthly',
        }),
      })

      await POST(request)

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_data: {
            metadata: {
              supabase_user_id: 'user-123',
            },
          },
          metadata: {
            supabase_user_id: 'user-123',
          },
        })
      )
    })
  })
})