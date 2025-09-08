import { setupServer } from 'msw/node'
import { handlers } from './mocks'

// Setup MSW server for Node.js environment (Jest tests)
export const server = setupServer(...handlers)

// Enable API mocking before tests start
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unhandled requests
  })
})

// Reset handlers after each test to prevent test interference
afterEach(() => {
  server.resetHandlers()
})

// Clean up after all tests are complete
afterAll(() => {
  server.close()
})