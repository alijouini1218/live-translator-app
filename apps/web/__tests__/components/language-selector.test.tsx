/**
 * Language Selector Component Tests
 * Tests language selection, validation, and auto-detection functionality
 */

import { render, screen, fireEvent, waitFor } from '../utils/test-helpers'
import { LanguageSelector } from '@/components/translator/language-selector'

// Mock language utilities
jest.mock('@live-translator/core', () => ({
  SUPPORTED_LANGUAGES: {
    en: { name: 'English', nativeName: 'English', code: 'en' },
    es: { name: 'Spanish', nativeName: 'Español', code: 'es' },
    fr: { name: 'French', nativeName: 'Français', code: 'fr' },
    de: { name: 'German', nativeName: 'Deutsch', code: 'de' },
    ja: { name: 'Japanese', nativeName: '日本語', code: 'ja' },
    zh: { name: 'Chinese', nativeName: '中文', code: 'zh' },
    auto: { name: 'Auto-detect', nativeName: 'Auto-detect', code: 'auto' },
  },
  isLanguagePairSupported: jest.fn((source: string, target: string) => {
    // Mock supported pairs - most pairs are supported except a few edge cases
    if (source === target) return false
    if (source === 'auto' && target === 'auto') return false
    return true
  }),
  getLanguageDisplayName: jest.fn((code: string) => {
    const names: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      ja: 'Japanese',
      zh: 'Chinese',
      auto: 'Auto-detect',
    }
    return names[code] || code
  }),
}))

describe('LanguageSelector', () => {
  const defaultProps = {
    sourceLanguage: 'en',
    targetLanguage: 'es',
    onSourceLanguageChange: jest.fn(),
    onTargetLanguageChange: jest.fn(),
    onSwapLanguages: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render source and target language selectors', () => {
      render(<LanguageSelector {...defaultProps} />)

      expect(screen.getByLabelText(/Source Language/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/Target Language/i)).toBeInTheDocument()
    })

    it('should display current language selections correctly', () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      const targetSelect = screen.getByLabelText(/Target Language/i)

      expect(sourceSelect).toHaveValue('en')
      expect(targetSelect).toHaveValue('es')
    })

    it('should show language swap button', () => {
      render(<LanguageSelector {...defaultProps} />)

      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })
      expect(swapButton).toBeInTheDocument()
      expect(swapButton).toHaveAttribute('aria-label', 'Swap Languages')
    })

    it('should display language options with native names', () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)

      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Español')).toBeInTheDocument()
      expect(screen.getByText('Français')).toBeInTheDocument()
      expect(screen.getByText('Deutsch')).toBeInTheDocument()
      expect(screen.getByText('日本語')).toBeInTheDocument()
    })

    it('should show auto-detect option for source language only', () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)
      expect(screen.getByText('Auto-detect')).toBeInTheDocument()

      const targetSelect = screen.getByLabelText(/Target Language/i)
      fireEvent.click(targetSelect)
      expect(screen.queryByText('Auto-detect')).not.toBeInTheDocument()
    })
  })

  describe('Language Selection', () => {
    it('should call onSourceLanguageChange when source language is changed', async () => {
      const mockOnSourceChange = jest.fn()
      
      render(<LanguageSelector {...defaultProps} onSourceLanguageChange={mockOnSourceChange} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'fr' } })

      await waitFor(() => {
        expect(mockOnSourceChange).toHaveBeenCalledWith('fr')
      })
    })

    it('should call onTargetLanguageChange when target language is changed', async () => {
      const mockOnTargetChange = jest.fn()
      
      render(<LanguageSelector {...defaultProps} onTargetLanguageChange={mockOnTargetChange} />)

      const targetSelect = screen.getByLabelText(/Target Language/i)
      fireEvent.change(targetSelect, { target: { value: 'de' } })

      await waitFor(() => {
        expect(mockOnTargetChange).toHaveBeenCalledWith('de')
      })
    })

    it('should prevent selecting the same language for source and target', async () => {
      const mockOnTargetChange = jest.fn()
      
      render(<LanguageSelector {...defaultProps} onTargetLanguageChange={mockOnTargetChange} />)

      const targetSelect = screen.getByLabelText(/Target Language/i)
      fireEvent.change(targetSelect, { target: { value: 'en' } }) // Same as source

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Source and target languages cannot be the same/i)).toBeInTheDocument()
      })

      expect(mockOnTargetChange).not.toHaveBeenCalledWith('en')
    })

    it('should handle auto-detect selection for source language', async () => {
      const mockOnSourceChange = jest.fn()
      
      render(<LanguageSelector {...defaultProps} onSourceLanguageChange={mockOnSourceChange} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'auto' } })

      await waitFor(() => {
        expect(mockOnSourceChange).toHaveBeenCalledWith('auto')
      })
    })

    it('should show loading state during language change', async () => {
      const slowOnSourceChange = jest.fn(() => new Promise(resolve => setTimeout(resolve, 500)))
      
      render(<LanguageSelector {...defaultProps} onSourceLanguageChange={slowOnSourceChange} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'fr' } })

      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText(/Updating language/i)).toBeInTheDocument()
    })
  })

  describe('Language Swap Functionality', () => {
    it('should swap languages when swap button is clicked', async () => {
      const mockOnSwap = jest.fn()
      
      render(<LanguageSelector {...defaultProps} onSwapLanguages={mockOnSwap} />)

      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })
      fireEvent.click(swapButton)

      await waitFor(() => {
        expect(mockOnSwap).toHaveBeenCalled()
      })
    })

    it('should disable swap button when source is auto-detect', () => {
      render(<LanguageSelector {...defaultProps} sourceLanguage="auto" />)

      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })
      expect(swapButton).toBeDisabled()
      expect(swapButton).toHaveAttribute('title', 'Cannot swap when using auto-detect')
    })

    it('should animate swap button when clicked', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })
      fireEvent.click(swapButton)

      await waitFor(() => {
        expect(swapButton).toHaveClass('animate-spin')
      })

      // Animation should complete
      await waitFor(() => {
        expect(swapButton).not.toHaveClass('animate-spin')
      }, { timeout: 500 })
    })

    it('should maintain language validity after swap', async () => {
      const mockOnSwap = jest.fn()
      
      render(
        <LanguageSelector 
          {...defaultProps} 
          sourceLanguage="en" 
          targetLanguage="fr"
          onSwapLanguages={mockOnSwap}
        />
      )

      const swapButton = screen.getByRole('button', { name: /Swap Languages/i })
      fireEvent.click(swapButton)

      await waitFor(() => {
        expect(mockOnSwap).toHaveBeenCalled()
      })

      // Should not show any validation errors
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('Language Pair Validation', () => {
    it('should show warning for unsupported language pairs', async () => {
      // Mock unsupported pair
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockReturnValue(false)

      render(<LanguageSelector {...defaultProps} sourceLanguage="en" targetLanguage="xyz" />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Language pair not supported/i)).toBeInTheDocument()
      })
    })

    it('should show supported status for valid language pairs', async () => {
      // Mock supported pair
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockReturnValue(true)

      render(<LanguageSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/Language pair supported/i)).toBeInTheDocument()
        expect(screen.getByRole('status')).toHaveClass('text-green-600')
      })
    })

    it('should validate language pairs in real-time', async () => {
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockReturnValue(true)

      render(<LanguageSelector {...defaultProps} />)

      const targetSelect = screen.getByLabelText(/Target Language/i)
      
      // Change to supported language
      fireEvent.change(targetSelect, { target: { value: 'fr' } })

      await waitFor(() => {
        expect(isLanguagePairSupported).toHaveBeenCalledWith('en', 'fr')
      })
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA labels and descriptions', () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      const targetSelect = screen.getByLabelText(/Target Language/i)

      expect(sourceSelect).toHaveAttribute('aria-describedby')
      expect(targetSelect).toHaveAttribute('aria-describedby')
      expect(sourceSelect).toHaveAttribute('role', 'combobox')
      expect(targetSelect).toHaveAttribute('role', 'combobox')
    })

    it('should support keyboard navigation', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      
      // Tab to source select
      sourceSelect.focus()
      expect(sourceSelect).toHaveFocus()

      // Arrow key should open dropdown
      fireEvent.keyDown(sourceSelect, { key: 'ArrowDown' })
      
      await waitFor(() => {
        expect(sourceSelect).toHaveAttribute('aria-expanded', 'true')
      })
    })

    it('should announce language changes to screen readers', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'fr' } })

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Source language changed to French/i)
      })
    })

    it('should have high contrast indicators for validation states', () => {
      // Mock unsupported pair
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockReturnValue(false)

      render(<LanguageSelector {...defaultProps} />)

      const errorIndicator = screen.getByRole('alert')
      expect(errorIndicator).toHaveClass('text-red-600')
      expect(errorIndicator).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Performance Optimization', () => {
    it('should debounce language validation checks', async () => {
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockReturnValue(true)

      render(<LanguageSelector {...defaultProps} />)

      const targetSelect = screen.getByLabelText(/Target Language/i)
      
      // Rapid changes
      fireEvent.change(targetSelect, { target: { value: 'fr' } })
      fireEvent.change(targetSelect, { target: { value: 'de' } })
      fireEvent.change(targetSelect, { target: { value: 'ja' } })

      // Wait for debounce
      await waitFor(() => {
        // Should only validate the final value
        expect(isLanguagePairSupported).toHaveBeenCalledWith('en', 'ja')
      }, { timeout: 1000 })

      // Should not have called for intermediate values
      expect(isLanguagePairSupported).not.toHaveBeenCalledWith('en', 'fr')
      expect(isLanguagePairSupported).not.toHaveBeenCalledWith('en', 'de')
    })

    it('should memoize language options to prevent re-renders', () => {
      const { rerender } = render(<LanguageSelector {...defaultProps} />)

      const initialOptions = screen.getAllByRole('option')
      
      // Re-render with same props
      rerender(<LanguageSelector {...defaultProps} />)

      const afterOptions = screen.getAllByRole('option')
      
      // Options should be the same instances (memoized)
      expect(initialOptions).toEqual(afterOptions)
    })

    it('should handle large language lists efficiently', async () => {
      // Mock a large language list
      jest.doMock('@live-translator/core', () => ({
        SUPPORTED_LANGUAGES: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `lang${i}`,
            { name: `Language ${i}`, nativeName: `Native ${i}`, code: `lang${i}` }
          ])
        ),
        isLanguagePairSupported: jest.fn(() => true),
        getLanguageDisplayName: jest.fn((code: string) => `Display ${code}`),
      }))

      const startTime = performance.now()
      render(<LanguageSelector {...defaultProps} />)
      const endTime = performance.now()

      // Should render efficiently even with many languages
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
      expect(screen.getByLabelText(/Source Language/i)).toBeInTheDocument()
    })
  })

  describe('User Experience Features', () => {
    it('should show recently used languages at the top', async () => {
      // Mock recent languages in localStorage
      const mockRecentLanguages = ['ja', 'de', 'fr']
      Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockRecentLanguages))

      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)

      // Recent languages should appear first
      const options = screen.getAllByRole('option')
      expect(options[0]).toHaveTextContent('日本語') // Japanese
      expect(options[1]).toHaveTextContent('Deutsch') // German
      expect(options[2]).toHaveTextContent('Français') // French
    })

    it('should save language selections to recent history', async () => {
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem')
      
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.change(sourceSelect, { target: { value: 'ja' } })

      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(
          'recentLanguages',
          expect.stringContaining('ja')
        )
      })
    })

    it('should show search/filter functionality for large language lists', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)

      // Should have search input for filtering
      expect(screen.getByPlaceholderText(/Search languages/i)).toBeInTheDocument()
    })

    it('should filter languages based on search input', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)

      const searchInput = screen.getByPlaceholderText(/Search languages/i)
      fireEvent.change(searchInput, { target: { value: 'span' } })

      await waitFor(() => {
        expect(screen.getByText('Spanish')).toBeInTheDocument()
        expect(screen.queryByText('French')).not.toBeInTheDocument()
        expect(screen.queryByText('German')).not.toBeInTheDocument()
      })
    })

    it('should handle empty search results gracefully', async () => {
      render(<LanguageSelector {...defaultProps} />)

      const sourceSelect = screen.getByLabelText(/Source Language/i)
      fireEvent.click(sourceSelect)

      const searchInput = screen.getByPlaceholderText(/Search languages/i)
      fireEvent.change(searchInput, { target: { value: 'xyz123' } })

      await waitFor(() => {
        expect(screen.getByText(/No languages found/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing language data gracefully', () => {
      // Mock empty language data
      jest.doMock('@live-translator/core', () => ({
        SUPPORTED_LANGUAGES: {},
        isLanguagePairSupported: jest.fn(() => false),
        getLanguageDisplayName: jest.fn(() => 'Unknown'),
      }))

      render(<LanguageSelector {...defaultProps} />)

      expect(screen.getByText(/No languages available/i)).toBeInTheDocument()
    })

    it('should recover from language validation errors', async () => {
      const { isLanguagePairSupported } = require('@live-translator/core')
      isLanguagePairSupported.mockImplementation(() => {
        throw new Error('Validation error')
      })

      render(<LanguageSelector {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/Unable to validate language pair/i)).toBeInTheDocument()
      })
    })

    it('should handle invalid language codes in props', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <LanguageSelector 
          {...defaultProps} 
          sourceLanguage="invalid-code"
          targetLanguage="another-invalid"
        />
      )

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid language code')
      )

      // Should fall back to default languages
      const sourceSelect = screen.getByLabelText(/Source Language/i)
      expect(sourceSelect).toHaveValue('en')
    })
  })
})