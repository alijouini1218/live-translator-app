'use client'

interface TranslationDisplayProps {
  sourceText: string
  targetText: string
  sourceLanguage: string
  targetLanguage: string
  isListening: boolean
  className?: string
}

export function TranslationDisplay({
  sourceText,
  targetText,
  sourceLanguage,
  targetLanguage,
  isListening,
  className = '',
}: TranslationDisplayProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Source text display */}
      <div className="bg-gray-50 rounded-lg p-6 min-h-24">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 capitalize">
            {sourceLanguage === 'auto' ? 'Detected' : sourceLanguage}
          </h3>
          {isListening && (
            <div className="flex items-center text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
              Listening...
            </div>
          )}
        </div>
        <div className="text-lg text-gray-900">
          {sourceText || (
            <span className="text-gray-400 italic">
              {isListening ? 'Speak to start translating...' : 'Source text will appear here'}
            </span>
          )}
          {isListening && sourceText && (
            <span className="inline-block w-2 h-5 bg-gray-900 animate-pulse ml-1"></span>
          )}
        </div>
      </div>

      {/* Translation arrow */}
      <div className="flex justify-center">
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>

      {/* Target text display */}
      <div className="bg-black text-white rounded-lg p-6 min-h-24">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-200 capitalize">
            {targetLanguage}
          </h3>
          {targetText && (
            <button
              onClick={() => {
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(targetText)
                  utterance.lang = targetLanguage
                  speechSynthesis.speak(utterance)
                }
              }}
              className="text-gray-200 hover:text-white transition-colors"
              title="Play audio"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.82L4.77 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.77l3.613-2.82a1 1 0 011 0zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.896-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.983 5.983 0 01-1.757 4.243 1 1 0 01-1.415-1.414A3.983 3.983 0 0013 10a3.983 3.983 0 00-1.172-2.829 1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
        <div className="text-lg text-white">
          {targetText || (
            <span className="text-gray-400 italic">
              Translation will appear here
            </span>
          )}
        </div>
      </div>
    </div>
  )
}