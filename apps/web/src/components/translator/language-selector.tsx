'use client'

import { useState } from 'react'
import { SUPPORTED_LANGUAGES, getLanguage } from '@live-translator/core'

interface LanguageSelectorProps {
  value: string
  onChange: (languageCode: string) => void
  allowAuto?: boolean
  label: string
  disabled?: boolean
}

export function LanguageSelector({ 
  value, 
  onChange, 
  allowAuto = false, 
  label, 
  disabled = false 
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedLanguage = value === 'auto' 
    ? { code: 'auto', name: 'Auto-detect' }
    : getLanguage(value) || { code: value, name: 'Unknown' }

  const handleSelect = (languageCode: string) => {
    onChange(languageCode)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full bg-white border border-gray-300 rounded-md px-4 py-3 text-left shadow-sm
          focus:outline-none focus:ring-2 focus:ring-black focus:border-black
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'}
        `}
      >
        <span className="block truncate">
          {selectedLanguage.name}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className={`h-5 w-5 text-gray-400 transform transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {allowAuto && (
            <button
              type="button"
              onClick={() => handleSelect('auto')}
              className={`
                relative cursor-pointer select-none py-2 pl-3 pr-9 w-full text-left
                ${value === 'auto' ? 'text-black bg-gray-100' : 'text-gray-900 hover:bg-gray-50'}
              `}
            >
              <span className="block truncate font-medium">
                Auto-detect
              </span>
              {value === 'auto' && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-black">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
          )}
          
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleSelect(language.code)}
              className={`
                relative cursor-pointer select-none py-2 pl-3 pr-9 w-full text-left
                ${value === language.code ? 'text-black bg-gray-100' : 'text-gray-900 hover:bg-gray-50'}
              `}
            >
              <span className="block truncate">
                {language.name}
              </span>
              {value === language.code && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-black">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}