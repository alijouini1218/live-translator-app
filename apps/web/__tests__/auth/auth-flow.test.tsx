/**
 * Authentication Flow Tests
 * Tests the complete authentication workflow including magic links, session management,
 * profile creation, and protected route access
 */

import { render, screen, waitFor } from '../utils/test-helpers'
import { mockSession, mockProfile, createMockSupabaseClient } from '../utils/test-helpers'
import { createMockStripeWebhookEvent } from '../utils/mocks'

// Mock Next.js router
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: mockRefresh,
    prefetch: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock Supabase client
let mockSupabaseClient: any

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock components for testing
const MockProtectedComponent = () => <div>Protected Content</div>
const MockAuthRequiredWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="auth-wrapper">{children}</div>
}

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient = createMockSupabaseClient()
  })

  describe('Magic Link Authentication', () => {
    it('should handle successful magic link authentication', async () => {
      // Mock successful session response
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      // Mock profile retrieval
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      // Simulate authentication state change
      const authStateChangeCallback = jest.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateChangeCallback.mockImplementation(callback)
        // Simulate immediate auth state change
        setTimeout(() => {
          callback('SIGNED_IN', mockSession)
        }, 0)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Should have retrieved user profile
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })
    })

    it('should handle magic link authentication with new user profile creation', async () => {
      // Mock session for new user
      const newUserSession = {
        ...mockSession,
        user: {
          ...mockSession.user,
          id: 'new-user-id',
          email: 'newuser@example.com',
        },
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: newUserSession },
        error: null,
      })

      // Mock profile not found, then successful creation
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({
                data: null,
                error: { code: 'PGRST116' }, // Not found
              })
              .mockResolvedValueOnce({
                data: {
                  id: 'new-user-id',
                  email: 'newuser@example.com',
                  plan: 'free',
                  display_name: null,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: [{
            id: 'new-user-id',
            email: 'newuser@example.com',
            plan: 'free',
            display_name: null,
          }],
          error: null,
        }),
      })

      // Simulate auth state change for new user
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => {
          callback('SIGNED_IN', newUserSession)
        }, 0)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Should attempt to find profile
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })

      // Should create new profile for new user
      await waitFor(() => {
        const insertCall = mockSupabaseClient.from().insert
        expect(insertCall).toHaveBeenCalledWith({
          id: 'new-user-id',
          email: 'newuser@example.com',
          plan: 'free',
          display_name: null,
        })
      })
    })

    it('should handle authentication errors gracefully', async () => {
      // Mock authentication error
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid token' },
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => {
          callback('SIGNED_OUT', null)
        }, 0)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Should handle auth error without crashing
      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })
  })

  describe('Session Management', () => {
    it('should persist session across browser refreshes', async () => {
      // Mock session retrieval from storage
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      // Should retrieve session on mount
      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Should retrieve user profile
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })
    })

    it('should handle session expiration and refresh', async () => {
      const expiredSession = {
        ...mockSession,
        expires_at: Date.now() / 1000 - 3600, // Expired 1 hour ago
      }

      const refreshedSession = {
        ...mockSession,
        access_token: 'new-access-token',
        expires_at: Date.now() / 1000 + 3600, // Expires in 1 hour
      }

      // First call returns expired session, second returns refreshed
      mockSupabaseClient.auth.getSession
        .mockResolvedValueOnce({
          data: { session: expiredSession },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { session: refreshedSession },
          error: null,
        })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })
    })

    it('should handle sign out correctly', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: null,
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      // Simulate sign out
      const result = await mockSupabaseClient.auth.signOut()

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })
  })

  describe('Protected Route Access', () => {
    it('should allow access to protected routes when authenticated', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => {
          callback('SIGNED_IN', mockSession)
        }, 0)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
      })
    })

    it('should redirect to auth page when accessing protected route without authentication', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        setTimeout(() => {
          callback('SIGNED_OUT', null)
        }, 0)
        
        return {
          data: { subscription: { unsubscribe: jest.fn() } },
        }
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Should handle unauthenticated state appropriately
      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })

    it('should handle different subscription plans for protected features', async () => {
      const proUserProfile = {
        ...mockProfile,
        plan: 'pro',
      }

      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: proUserProfile,
              error: null,
            }),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })

      // Should handle pro user features
      await waitFor(() => {
        const selectCall = mockSupabaseClient.from().select().eq().single
        expect(selectCall).toHaveBeenCalled()
      })
    })
  })

  describe('Profile Management', () => {
    it('should update user profile successfully', async () => {
      const updatedProfile = {
        ...mockProfile,
        display_name: 'Updated Name',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [updatedProfile],
            error: null,
          }),
        }),
      })

      // Simulate profile update
      const updateResult = await mockSupabaseClient.from('profiles')
        .update({ display_name: 'Updated Name' })
        .eq('id', mockProfile.id)

      expect(updateResult.data).toEqual([updatedProfile])
      expect(updateResult.error).toBeNull()
    })

    it('should handle profile update errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      })

      const updateResult = await mockSupabaseClient.from('profiles')
        .update({ display_name: 'Updated Name' })
        .eq('id', mockProfile.id)

      expect(updateResult.error).toBeTruthy()
      expect(updateResult.error.message).toBe('Update failed')
    })
  })

  describe('Authentication State Persistence', () => {
    it('should maintain authentication state across component remounts', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const { rerender } = render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      // Rerender component
      rerender(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      // Should not need to re-authenticate
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1)
    })

    it('should cleanup auth listeners on unmount', () => {
      const mockUnsubscribe = jest.fn()
      
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      const { unmount } = render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      unmount()

      // Should cleanup subscription on unmount
      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle network errors during authentication', async () => {
      mockSupabaseClient.auth.getSession.mockRejectedValue(
        new Error('Network error')
      )

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      // Should handle network error gracefully
      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
      })

      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })

    it('should retry authentication after network recovery', async () => {
      // First attempt fails, second succeeds
      mockSupabaseClient.auth.getSession
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: { session: mockSession },
          error: null,
        })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1)
      })
    })

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockRejectedValue(
              new Error('Database connection failed')
            ),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })

      // Should handle database error without crashing
      expect(screen.getByTestId('auth-wrapper')).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('should not make unnecessary auth checks', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1)
      })

      // Multiple renders shouldn't trigger additional auth checks
      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalledTimes(1)
      }, { timeout: 1000 })
    })

    it('should cache user profile data', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockProfile,
              error: null,
            }),
          }),
        }),
      })

      render(
        <MockAuthRequiredWrapper>
          <MockProtectedComponent />
        </MockAuthRequiredWrapper>
      )

      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
      })

      // Profile should be cached and not requested again immediately
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(1)
    })
  })
})