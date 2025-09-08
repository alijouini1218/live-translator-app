/**
 * System prompts and instructions for OpenAI Realtime API
 */

/**
 * Generate system prompt for simultaneous interpretation
 */
export function generateRealtimeSystemPrompt(
  sourceLanguage: string,
  targetLanguage: string,
  glossary?: Record<string, string>
): string {
  let prompt = `You are a simultaneous interpreter. Translate from ${sourceLanguage} to ${targetLanguage}.

Constraints:
- Emit very short, punctuated phrases (~0.5–1.5s of speech)
- Preserve proper nouns; keep numbers as digits
- If uncertain, correct in the next chunk rather than stalling
- Avoid filler; do not re-translate already emitted content
- Maintain natural flow and rhythm for the target language
- Handle interruptions gracefully by completing the current phrase`;

  if (glossary && Object.keys(glossary).length > 0) {
    prompt += '\n\nGlossary (use these specific translations):';
    Object.entries(glossary).forEach(([key, value]) => {
      prompt += `\n- ${key}: ${value}`;
    });
  }

  return prompt;
}

/**
 * Instructions for OpenAI Realtime session configuration
 */
export const REALTIME_SESSION_CONFIG = {
  modalities: ['text', 'audio'] as const,
  instructions: 'You are a helpful assistant for real-time translation.',
  voice: 'alloy' as const,
  input_audio_format: 'pcm16' as const,
  output_audio_format: 'pcm16' as const,
  input_audio_transcription: {
    model: 'whisper-1',
  },
  turn_detection: {
    type: 'server_vad' as const,
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
  },
  tools: [],
  tool_choice: 'none' as const,
  temperature: 0.3,
  max_response_output_tokens: 4096,
};

/**
 * Prompt templates for different translation scenarios
 */
export const PROMPT_TEMPLATES = {
  BUSINESS_MEETING: (source: string, target: string) => `
    You are interpreting a business meeting from ${source} to ${target}.
    Focus on:
    - Professional terminology
    - Clear, concise translations
    - Maintaining speaker intent and tone
    - Technical accuracy
  `,
  
  CASUAL_CONVERSATION: (source: string, target: string) => `
    You are interpreting a casual conversation from ${source} to ${target}.
    Focus on:
    - Natural, conversational tone
    - Cultural context adaptation
    - Colloquialisms and idioms
    - Emotional nuance
  `,
  
  MEDICAL_CONSULTATION: (source: string, target: string) => `
    You are interpreting a medical consultation from ${source} to ${target}.
    Focus on:
    - Medical terminology accuracy
    - Patient safety (flag unclear medical terms)
    - Empathetic tone preservation
    - Precise symptom descriptions
  `,
  
  EDUCATIONAL: (source: string, target: string) => `
    You are interpreting educational content from ${source} to ${target}.
    Focus on:
    - Clear explanations
    - Academic terminology
    - Maintaining instructional flow
    - Concept clarity
  `,
};

/**
 * Get appropriate prompt template based on context
 */
export function getPromptForContext(
  context: keyof typeof PROMPT_TEMPLATES,
  sourceLanguage: string,
  targetLanguage: string,
  glossary?: Record<string, string>
): string {
  const basePrompt = PROMPT_TEMPLATES[context](sourceLanguage, targetLanguage);
  const systemPrompt = generateRealtimeSystemPrompt(sourceLanguage, targetLanguage, glossary);
  
  return `${basePrompt}\n\n${systemPrompt}`;
}