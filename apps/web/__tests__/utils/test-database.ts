/**
 * Test database utilities for setting up test data and cleaning up after tests
 */

import { mockProfile, mockTranslationSession } from './test-helpers'

// Mock database state
let mockDatabase = {
  profiles: new Map(),
  sessions: new Map(),
  transcripts: new Map(),
}

// Helper to reset database state between tests
export function resetTestDatabase() {
  mockDatabase = {
    profiles: new Map(),
    sessions: new Map(), 
    transcripts: new Map(),
  }
}

// Helper to seed test data
export function seedTestData() {
  // Add default test user profile
  mockDatabase.profiles.set(mockProfile.id, mockProfile)
  
  // Add default test session
  mockDatabase.sessions.set(mockTranslationSession.id, mockTranslationSession)
}

// Mock Supabase operations
export const mockSupabaseOperations = {
  profiles: {
    select: jest.fn().mockImplementation((fields = '*') => ({
      eq: jest.fn().mockImplementation((field, value) => ({
        single: jest.fn().mockImplementation(() => {
          const profile = mockDatabase.profiles.get(value)
          return Promise.resolve({
            data: profile || null,
            error: profile ? null : { message: 'Profile not found' },
          })
        }),
      })),
    })),
    
    insert: jest.fn().mockImplementation((data) => ({
      select: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(() => {
          const id = data.id || `profile-${Date.now()}`
          const profile = { ...data, id }
          mockDatabase.profiles.set(id, profile)
          return Promise.resolve({
            data: profile,
            error: null,
          })
        }),
      })),
    })),
    
    update: jest.fn().mockImplementation((updates) => ({
      eq: jest.fn().mockImplementation((field, value) => {
        const profile = mockDatabase.profiles.get(value)
        if (profile) {
          const updated = { ...profile, ...updates }
          mockDatabase.profiles.set(value, updated)
          return Promise.resolve({
            data: updated,
            error: null,
          })
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Profile not found' },
        })
      }),
    })),
  },

  sessions: {
    select: jest.fn().mockImplementation((fields = '*') => ({
      eq: jest.fn().mockImplementation((field, value) => {
        const sessions = Array.from(mockDatabase.sessions.values()).filter(
          session => session[field] === value
        )
        return Promise.resolve({
          data: sessions,
          error: null,
        })
      }),
      order: jest.fn().mockImplementation(() => ({
        limit: jest.fn().mockImplementation((limit) => {
          const sessions = Array.from(mockDatabase.sessions.values()).slice(0, limit)
          return Promise.resolve({
            data: sessions,
            error: null,
          })
        }),
      })),
    })),
    
    insert: jest.fn().mockImplementation((data) => ({
      select: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(() => {
          const id = data.id || `session-${Date.now()}`
          const session = { ...data, id }
          mockDatabase.sessions.set(id, session)
          return Promise.resolve({
            data: session,
            error: null,
          })
        }),
      })),
    })),
    
    update: jest.fn().mockImplementation((updates) => ({
      eq: jest.fn().mockImplementation((field, value) => {
        const session = mockDatabase.sessions.get(value)
        if (session) {
          const updated = { ...session, ...updates }
          mockDatabase.sessions.set(value, updated)
          return Promise.resolve({
            data: updated,
            error: null,
          })
        }
        return Promise.resolve({
          data: null,
          error: { message: 'Session not found' },
        })
      }),
    })),
  },

  transcripts: {
    select: jest.fn().mockImplementation((fields = '*') => ({
      eq: jest.fn().mockImplementation((field, value) => {
        const transcripts = Array.from(mockDatabase.transcripts.values()).filter(
          transcript => transcript[field] === value
        )
        return Promise.resolve({
          data: transcripts,
          error: null,
        })
      }),
    })),
    
    insert: jest.fn().mockImplementation((data) => ({
      select: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(() => {
          const id = data.id || `transcript-${Date.now()}`
          const transcript = { ...data, id }
          mockDatabase.transcripts.set(id, transcript)
          return Promise.resolve({
            data: transcript,
            error: null,
          })
        }),
      })),
    })),
  },
}

// Helper to get current database state (for debugging tests)
export function getTestDatabaseState() {
  return {
    profiles: Array.from(mockDatabase.profiles.values()),
    sessions: Array.from(mockDatabase.sessions.values()),
    transcripts: Array.from(mockDatabase.transcripts.values()),
  }
}

// Helper to simulate database errors
export function simulateDatabaseError(table: string, operation: string, error: any) {
  const tableOps = mockSupabaseOperations[table as keyof typeof mockSupabaseOperations]
  if (tableOps && tableOps[operation as keyof typeof tableOps]) {
    ;(tableOps[operation as keyof typeof tableOps] as jest.Mock).mockImplementationOnce(() => {
      throw error
    })
  }
}

// Helper to verify database operations
export function verifyDatabaseOperation(table: string, operation: string) {
  const tableOps = mockSupabaseOperations[table as keyof typeof mockSupabaseOperations]
  if (tableOps && tableOps[operation as keyof typeof tableOps]) {
    return (tableOps[operation as keyof typeof tableOps] as jest.Mock).mock.calls
  }
  return []
}