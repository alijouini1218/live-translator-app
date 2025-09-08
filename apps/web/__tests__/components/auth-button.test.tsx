import { render, screen, fireEvent, waitFor } from '../utils/test-helpers'
import { AuthButton } from '@/components/auth/auth-button'
import { mockSupabaseClient } from '../utils/mocks'

// Mock dependencies
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock window.alert
global.alert = jest.fn()

describe('AuthButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful auth response by default
    mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: null,
    })
  })

  describe('Rendering', () => {
    it('should render sign in form by default', () => {
      render(<AuthButton />)
      
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should render sign up form when variant is signup', () => {
      render(<AuthButton variant="signup" />)
      
      expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
    })

    it('should have submit button disabled when email is empty', () => {
      render(<AuthButton />)
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when email is entered', async () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Form submission', () => {
    it('should handle successful magic link request', async () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Sending...')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost/auth/callback',
          },
        })
      })
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Check your email for the login link!')
      })
      
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should handle auth errors', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockResolvedValue({
        data: {},
        error: { message: 'Invalid email address' },
      })

      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Error: Invalid email address')
      })
    })

    it('should handle unexpected errors', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockRejectedValue(
        new Error('Network error')
      )

      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('An unexpected error occurred')
      })
    })

    it('should not submit when email is empty', async () => {
      render(<AuthButton />)
      
      const form = screen.getByRole('form') || screen.getByTestId('auth-form') || document.querySelector('form')
      expect(form).toBeInTheDocument()
      
      fireEvent.submit(form!)
      
      expect(mockSupabaseClient.auth.signInWithOtp).not.toHaveBeenCalled()
    })

    it('should prevent double submission while loading', async () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      
      // Submit twice quickly
      fireEvent.click(submitButton)
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Email validation', () => {
    it('should accept valid email formats', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ]

      for (const email of validEmails) {
        render(<AuthButton />)
        
        const emailInput = screen.getByLabelText('Email address')
        fireEvent.change(emailInput, { target: { value: email } })
        
        const submitButton = screen.getByRole('button', { name: 'Sign In' })
        expect(submitButton).not.toBeDisabled()
        
        // Clean up for next iteration
        document.body.innerHTML = ''
      }
    })

    it('should have correct input attributes', () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
      
      expect(emailInput.type).toBe('email')
      expect(emailInput.required).toBe(true)
      expect(emailInput.autocomplete).toBe('email')
      expect(emailInput.name).toBe('email')
      expect(emailInput.id).toBe('email')
    })
  })

  describe('Loading state', () => {
    it('should show loading state during submission', async () => {
      // Make the auth request hang to test loading state
      mockSupabaseClient.auth.signInWithOtp.mockImplementation(
        () => new Promise(resolve => {
          // Never resolve to test loading state
        })
      )

      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(submitButton)
      
      expect(screen.getByText('Sending...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    it('should reset loading state after error', async () => {
      mockSupabaseClient.auth.signInWithOtp.mockRejectedValue(
        new Error('Network error')
      )

      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
      })
      
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).not.toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<AuthButton />)
      
      const form = document.querySelector('form')
      expect(form).toBeInTheDocument()
      
      const label = screen.getByLabelText('Email address')
      const input = screen.getByRole('textbox', { name: 'Email address' })
      const button = screen.getByRole('button', { name: 'Sign In' })
      
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
      expect(button).toBeInTheDocument()
      expect(button.type).toBe('submit')
    })

    it('should associate label with input correctly', () => {
      render(<AuthButton />)
      
      const input = screen.getByLabelText('Email address') as HTMLInputElement
      const label = document.querySelector('label[for="email"]')
      
      expect(label).toBeInTheDocument()
      expect(input.id).toBe('email')
    })
  })

  describe('User experience', () => {
    it('should maintain email value during loading', async () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address') as HTMLInputElement
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.click(screen.getByRole('button', { name: 'Sign In' }))
      
      expect(emailInput.value).toBe('test@example.com')
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
      })
      
      expect(emailInput.value).toBe('test@example.com')
    })

    it('should handle form submission via Enter key', async () => {
      render(<AuthButton />)
      
      const emailInput = screen.getByLabelText('Email address')
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      fireEvent.keyPress(emailInput, { key: 'Enter', code: 13, charCode: 13 })
      
      await waitFor(() => {
        expect(mockSupabaseClient.auth.signInWithOtp).toHaveBeenCalledWith({
          email: 'test@example.com',
          options: {
            emailRedirectTo: 'http://localhost/auth/callback',
          },
        })
      })
    })
  })
})