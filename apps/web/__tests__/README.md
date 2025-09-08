# Live Translator App Test Suite

This comprehensive test suite validates all aspects of the Live Translator application, ensuring reliability, performance, and security across the entire stack.

## Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── ephemeral-session.test.ts
│   ├── stripe-webhook.test.ts
│   ├── checkout.test.ts
│   ├── tts.test.ts
│   ├── ptt.test.ts
│   └── auth-callback.test.ts
├── components/             # React component tests
│   └── auth-button.test.tsx
├── hooks/                  # Custom hook tests
│   └── use-realtime-translation.test.ts
├── e2e/                    # End-to-end tests
│   ├── auth-flow.spec.ts
│   ├── billing-integration.spec.ts
│   └── realtime-translation.spec.ts
├── integration/            # Integration & smoke tests
│   └── smoke-tests.test.ts
└── utils/                  # Test utilities
    ├── test-helpers.ts
    ├── mocks.ts
    ├── msw-setup.ts
    └── test-database.ts
```

## Test Categories

### 1. Unit Tests
- **API Routes**: Test individual API endpoints with mocked dependencies
- **Components**: Test React components in isolation
- **Hooks**: Test custom React hooks with renderHook utilities
- **Utilities**: Test helper functions and business logic

### 2. Integration Tests
- **Database Operations**: Test Supabase interactions with Row Level Security
- **External APIs**: Test OpenAI, ElevenLabs, and Stripe integrations
- **Authentication Flow**: Test complete auth workflows
- **Billing Pipeline**: Test subscription management end-to-end

### 3. End-to-End Tests
- **User Journeys**: Test complete user workflows from browser perspective
- **Cross-browser Testing**: Chrome, Firefox, Safari, Mobile
- **Performance Validation**: Latency requirements, connection stability
- **Accessibility**: WCAG 2.1 AA compliance testing

### 4. Smoke Tests
- **Critical Functionality**: High-level validation of core features
- **Service Connectivity**: Verify external service availability
- **Environment Configuration**: Validate deployment readiness

## Key Testing Requirements

### Performance Requirements
- **< 700ms first audible translation** in realtime mode
- **95%+ successful WebRTC connections** on good networks
- **Auto-fallback to PTT** when RTT > 250ms

### Security Requirements
- **Authentication protection** for all protected routes
- **Webhook signature validation** for Stripe events
- **Input sanitization** for all API endpoints
- **CORS configuration** for browser security

### Accessibility Requirements
- **WCAG 2.1 AA compliance** for all user interfaces
- **Keyboard navigation** support
- **Screen reader compatibility**
- **Mobile touch targets** minimum 44px

## Running Tests

### Prerequisites
```bash
cd apps/web
npm install
```

### Unit & Integration Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# Run specific test suites
npm test -- --testPathPattern=api
npm test -- --testPathPattern=components
npm test -- --testPathPattern=hooks
```

### End-to-End Tests
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI for debugging
npm run test:e2e:ui

# Run in headed mode
npm run test:e2e:headed
```

### Smoke Tests
```bash
# Run integration smoke tests
RUN_SMOKE_TESTS=true npm test -- --testNamePattern="smoke"

# Run in CI environment (with real API keys)
CI=true npm test -- --testNamePattern="smoke"
```

## Test Configuration

### Environment Variables
```bash
# Required for API tests
OPENAI_API_KEY=your_openai_key
ELEVENLABS_API_KEY=your_elevenlabs_key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE=your_service_role_key

# Test environment configuration
NODE_ENV=test
CI=true  # for CI/CD environments
RUN_SMOKE_TESTS=true  # for integration testing
```

### Mock Services
The test suite uses comprehensive mocking for external services:

- **Supabase**: Mocked authentication and database operations
- **Stripe**: Mocked payment processing and webhooks
- **OpenAI**: Mocked Realtime API and completions
- **ElevenLabs**: Mocked text-to-speech generation
- **WebRTC**: Mocked peer connections and media streams

### Test Data
Test utilities provide realistic mock data:
- User profiles with different subscription levels
- Translation sessions with timing metadata
- Audio streams and WebRTC connections
- Stripe events and payment states

## Continuous Integration

### GitHub Actions Workflow
The CI pipeline includes:

1. **Unit Tests**: Jest with coverage reporting
2. **API Tests**: Route testing with environment validation
3. **E2E Tests**: Playwright across multiple browsers
4. **Performance Audit**: Lighthouse CI for web vitals
5. **Security Scan**: npm audit + Snyk vulnerability scanning
6. **Accessibility Tests**: pa11y automated accessibility testing

### Quality Gates
- **Code Coverage**: Minimum 70% overall coverage
- **Performance**: Lighthouse scores > 80 for all categories
- **Security**: No high-severity vulnerabilities
- **Accessibility**: WCAG 2.1 AA compliance

## Debugging Tests

### Debug Unit Tests
```bash
# Run specific test file
npm test -- auth-button.test.tsx

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand auth-button.test.tsx
```

### Debug E2E Tests
```bash
# Run with Playwright inspector
npm run test:e2e -- --debug

# Run specific spec
npm run test:e2e -- auth-flow.spec.ts

# Generate trace files
npm run test:e2e -- --trace on
```

### Common Issues

1. **WebRTC Tests Failing**: Check browser permissions and mock setup
2. **API Tests Timing Out**: Verify environment variables and network connectivity
3. **E2E Tests Flaky**: Add proper wait conditions and element selectors
4. **Coverage Issues**: Ensure all code paths are tested, including error cases

## Performance Testing

### Latency Requirements
- Realtime connection establishment: < 2 seconds
- First translation output: < 700ms
- PTT pipeline total latency: < 2 seconds
- API response times: < 500ms average

### Load Testing
```bash
# Run concurrent connection tests
npm test -- --testNamePattern="concurrent"

# Simulate high-load scenarios
npm test -- --testNamePattern="performance"
```

## Monitoring & Alerting

### Test Result Monitoring
- **CI/CD Dashboard**: GitHub Actions workflow status
- **Coverage Tracking**: Codecov integration
- **Performance Metrics**: Lighthouse CI trends
- **Error Alerting**: Failed test notifications

### Health Checks
Smoke tests validate:
- Service connectivity and authentication
- Database schema and RLS policies
- API endpoint responsiveness
- External service availability

## Contributing

### Adding New Tests
1. Follow the existing test structure and naming conventions
2. Use descriptive test names that explain the behavior being tested
3. Include both happy path and error cases
4. Add appropriate mocks for external dependencies
5. Update test documentation for new test categories

### Test Guidelines
- **Test Behavior, Not Implementation**: Focus on what the code does, not how
- **Use Realistic Test Data**: Mirror production scenarios
- **Mock External Dependencies**: Keep tests deterministic and fast
- **Write Maintainable Tests**: Clear, readable, and well-organized
- **Test Edge Cases**: Handle errors, timeouts, and boundary conditions

### Performance Considerations
- Keep unit tests under 100ms each
- Use proper mocking to avoid network calls
- Clean up resources in test teardown
- Parallelize tests where possible
- Use focused test runs during development