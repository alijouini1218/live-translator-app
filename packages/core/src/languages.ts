import { Language, VoiceInfo } from './types';

/**
 * ElevenLabs voice information by language
 * Using popular pre-made voices from ElevenLabs
 */
export const VOICE_MAP: Record<string, VoiceInfo> = {
  en: {
    id: '21m00Tcm4TlvDq8ikWAM', // Rachel - English
    name: 'Rachel',
    accent: 'American',
    gender: 'female',
    age: 'young',
    description: 'Clear American English voice',
  },
  es: {
    id: 'VR6AewLTigWG4xSOukaG', // Arnold - Multilingual
    name: 'Arnold',
    accent: 'Spanish',
    gender: 'male',
    age: 'middle_aged',
    description: 'Warm Spanish voice',
  },
  fr: {
    id: 'TxGEqnHWrfWFTfGW9XjX', // Josh - Multilingual
    name: 'Josh',
    accent: 'French',
    gender: 'male',
    age: 'middle_aged',
    description: 'Natural French voice',
  },
  de: {
    id: 'pNInz6obpgDQGcFmaJgB', // Adam - Multilingual
    name: 'Adam',
    accent: 'German',
    gender: 'male',
    age: 'middle_aged',
    description: 'Professional German voice',
  },
  it: {
    id: 'AZnzlk1XvdvUeBnXmlld', // Domi - Multilingual
    name: 'Domi',
    accent: 'Italian',
    gender: 'female',
    age: 'young',
    description: 'Expressive Italian voice',
  },
  pt: {
    id: 'CYw3kZ02Hs0563khs1Fj', // Dave - Multilingual
    name: 'Dave',
    accent: 'Portuguese',
    gender: 'male',
    age: 'young',
    description: 'Friendly Portuguese voice',
  },
  ja: {
    id: 'bVMeCyTHy58xNoL34h3p', // Jeremy - Multilingual
    name: 'Jeremy',
    accent: 'Japanese',
    gender: 'male',
    age: 'young',
    description: 'Clear Japanese voice',
  },
  ko: {
    id: 'N2lVS1w4EtoT3dr4eOWO', // Callum - Multilingual
    name: 'Callum',
    accent: 'Korean',
    gender: 'male',
    age: 'middle_aged',
    description: 'Warm Korean voice',
  },
};

/**
 * Language definitions with ElevenLabs voice mappings
 */
export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'en',
    name: 'English',
    voice_id: VOICE_MAP.en.id,
  },
  {
    code: 'es',
    name: 'Spanish',
    voice_id: VOICE_MAP.es.id,
  },
  {
    code: 'fr',
    name: 'French',
    voice_id: VOICE_MAP.fr.id,
  },
  {
    code: 'de',
    name: 'German',
    voice_id: VOICE_MAP.de.id,
  },
  {
    code: 'it',
    name: 'Italian',
    voice_id: VOICE_MAP.it.id,
  },
  {
    code: 'pt',
    name: 'Portuguese',
    voice_id: VOICE_MAP.pt.id,
  },
  {
    code: 'ja',
    name: 'Japanese',
    voice_id: VOICE_MAP.ja.id,
  },
  {
    code: 'ko',
    name: 'Korean',
    voice_id: VOICE_MAP.ko.id,
  },
];

/**
 * Map language code to ElevenLabs voice ID
 */
export const languageToVoice: Record<string, string> = {
  en: VOICE_MAP.en.id, // English - Rachel
  es: VOICE_MAP.es.id, // Spanish - Arnold
  fr: VOICE_MAP.fr.id, // French - Josh
  de: VOICE_MAP.de.id, // German - Adam
  it: VOICE_MAP.it.id, // Italian - Domi
  pt: VOICE_MAP.pt.id, // Portuguese - Dave
  ja: VOICE_MAP.ja.id, // Japanese - Jeremy
  ko: VOICE_MAP.ko.id, // Korean - Callum
};

/**
 * Get language by code
 */
export function getLanguage(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Get voice ID for language
 */
export function getVoiceForLanguage(languageCode: string): string | undefined {
  return languageToVoice[languageCode];
}

/**
 * Get default language pairs for translation
 */
export const DEFAULT_LANGUAGE_PAIRS = [
  { source: 'en', target: 'es' },
  { source: 'en', target: 'fr' },
  { source: 'es', target: 'en' },
  { source: 'fr', target: 'en' },
];

/**
 * Check if a language pair is supported
 */
export function isLanguagePairSupported(source: string, target: string): boolean {
  const sourceSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === source);
  const targetSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === target);
  return sourceSupported && targetSupported && source !== target;
}

/**
 * Get voice information for a language
 */
export function getVoiceInfo(languageCode: string): VoiceInfo | undefined {
  return VOICE_MAP[languageCode];
}

/**
 * Get all available voices
 */
export function getAllVoices(): Record<string, VoiceInfo> {
  return VOICE_MAP;
}

/**
 * Check if TTS is supported for a language
 */
export function isTTSSupported(languageCode: string): boolean {
  return languageCode in languageToVoice && languageToVoice[languageCode] !== '';
}

/**
 * Get best voice for language with fallback
 */
export function getBestVoiceForLanguage(languageCode: string): string {
  const voiceId = getVoiceForLanguage(languageCode);
  if (voiceId) {
    return voiceId;
  }
  // Fallback to English voice if language not supported
  return languageToVoice.en || '21m00Tcm4TlvDq8ikWAM';
}