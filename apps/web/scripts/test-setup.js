#!/usr/bin/env node

/**
 * Test setup script for Live Translator App
 * Prepares the test environment and validates configuration
 */

const fs = require('fs')
const path = require('path')

console.log('🔧 Setting up test environment...\n')

// Check Node.js version
const nodeVersion = process.version
const requiredNodeVersion = '18.0.0'
console.log(`✓ Node.js version: ${nodeVersion}`)

// Check if required files exist
const requiredFiles = [
  'jest.config.js',
  'jest.setup.js', 
  'playwright.config.ts',
  '__tests__/utils/test-helpers.ts',
  '__tests__/utils/mocks.ts',
]

console.log('\n📁 Checking required test files...')
let missingFiles = []

for (const file of requiredFiles) {
  const filePath = path.join(process.cwd(), file)
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${file}`)
  } else {
    console.log(`✗ ${file}`)
    missingFiles.push(file)
  }
}

if (missingFiles.length > 0) {
  console.log(`\n❌ Missing test files: ${missingFiles.join(', ')}`)
  process.exit(1)
}

// Check environment variables for different test types
console.log('\n🔐 Checking environment configuration...')

const requiredEnvVars = {
  basic: [
    'NODE_ENV',
  ],
  integration: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ],
  smoke: [
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY', 
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ],
}

// Check basic environment
for (const envVar of requiredEnvVars.basic) {
  if (process.env[envVar]) {
    console.log(`✓ ${envVar}`)
  } else {
    console.log(`⚠ ${envVar} (will use default)`)
  }
}

// Check integration test environment
const hasIntegrationVars = requiredEnvVars.integration.every(envVar => process.env[envVar])
if (hasIntegrationVars) {
  console.log('✓ Integration test environment configured')
} else {
  console.log('⚠ Integration test environment incomplete (tests will be mocked)')
}

// Check smoke test environment
const hasSmokeVars = requiredEnvVars.smoke.every(envVar => process.env[envVar])
if (hasSmokeVars) {
  console.log('✓ Smoke test environment configured')
} else {
  console.log('⚠ Smoke test environment incomplete (smoke tests will be skipped)')
}

// Create test directories if they don't exist
console.log('\n📂 Ensuring test directories exist...')

const testDirs = [
  '__tests__/api',
  '__tests__/components', 
  '__tests__/hooks',
  '__tests__/e2e',
  '__tests__/integration',
  '__tests__/utils',
  'coverage',
  'playwright-report',
]

for (const dir of testDirs) {
  const dirPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    console.log(`✓ Created ${dir}`)
  } else {
    console.log(`✓ ${dir} exists`)
  }
}

// Check package.json test scripts
console.log('\n📜 Checking test scripts...')

const packageJsonPath = path.join(process.cwd(), 'package.json')
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  
  const expectedScripts = [
    'test',
    'test:watch',
    'test:coverage',
    'test:e2e',
  ]
  
  for (const script of expectedScripts) {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`✓ ${script}`)
    } else {
      console.log(`✗ ${script}`)
    }
  }
} else {
  console.log('✗ package.json not found')
}

// Create .env.test.example if it doesn't exist
console.log('\n🔧 Creating example environment files...')

const exampleEnvContent = `# Test Environment Variables
# Copy to .env.test and fill in actual values

# Basic configuration
NODE_ENV=test

# Supabase (required for integration tests)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key

# OpenAI (required for smoke tests)
OPENAI_API_KEY=your-openai-api-key
OPENAI_REALTIME_MODEL=gpt-4o-realtime-preview

# ElevenLabs (required for smoke tests)
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_MODEL_ID=eleven_turbo_v2_5
ELEVENLABS_DEFAULT_VOICE_ID=your-default-voice-id

# Stripe (required for smoke tests)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-publishable-key

# Test flags
RUN_SMOKE_TESTS=false
RUN_INTEGRATION_TESTS=true
`

const envExamplePath = path.join(process.cwd(), '.env.test.example')
if (!fs.existsSync(envExamplePath)) {
  fs.writeFileSync(envExamplePath, exampleEnvContent)
  console.log('✓ Created .env.test.example')
} else {
  console.log('✓ .env.test.example exists')
}

// Validate test dependencies
console.log('\n📦 Checking test dependencies...')

const requiredDependencies = [
  '@testing-library/react',
  '@testing-library/jest-dom', 
  '@testing-library/user-event',
  '@playwright/test',
  'jest',
  'jest-environment-jsdom',
  'msw',
]

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  }
  
  for (const dep of requiredDependencies) {
    if (allDeps[dep]) {
      console.log(`✓ ${dep}`)
    } else {
      console.log(`✗ ${dep} (missing)`)
    }
  }
}

// Final summary
console.log('\n🎉 Test setup complete!')
console.log('\n📋 Next steps:')
console.log('1. Copy .env.test.example to .env.test and fill in your API keys')
console.log('2. Run "npm test" to execute the test suite')
console.log('3. Run "npm run test:e2e" for end-to-end tests')
console.log('4. Run "RUN_SMOKE_TESTS=true npm test -- --testNamePattern=smoke" for integration tests')

console.log('\n🔍 Test coverage goals:')
console.log('- Unit tests: 70%+ coverage on all components and utilities')
console.log('- API tests: 100% coverage on all routes') 
console.log('- E2E tests: All critical user journeys')
console.log('- Performance: < 700ms first translation, 95%+ connection success')
console.log('- Security: All auth flows, input validation, CORS policies')
console.log('- Accessibility: WCAG 2.1 AA compliance')

if (missingFiles.length === 0 && hasIntegrationVars) {
  console.log('\n✅ Test environment ready!')
  process.exit(0)
} else {
  console.log('\n⚠️  Test environment needs configuration')
  process.exit(0)
}