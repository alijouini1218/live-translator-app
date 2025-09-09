#!/usr/bin/env node

/**
 * Live Translator Setup Verification Script
 * 
 * This script verifies that all required environment variables and 
 * Supabase configuration are properly set up for authentication to work.
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// ANSI colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(colors.green + '✓ ', message);
}

function logError(message) {
  log(colors.red + '✗ ', message);
}

function logWarning(message) {
  log(colors.yellow + '⚠ ', message);
}

function logInfo(message) {
  log(colors.cyan + 'ℹ ', message);
}

function logHeader(message) {
  console.log('\n' + colors.bold + colors.blue + message + colors.reset);
  console.log(colors.blue + '='.repeat(message.length) + colors.reset);
}

async function checkEnvironmentVariables() {
  logHeader('Checking Environment Variables');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE',
    'APP_BASE_URL'
  ];
  
  const optionalVars = [
    'OPENAI_API_KEY',
    'ELEVENLABS_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'
  ];

  let allRequired = true;
  
  // Check required variables
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      if (process.env[varName].includes('your_') || process.env[varName].includes('your-')) {
        logWarning(`${varName} is set but contains placeholder values`);
        allRequired = false;
      } else {
        logSuccess(`${varName} is configured`);
      }
    } else {
      logError(`${varName} is missing`);
      allRequired = false;
    }
  }
  
  // Check optional variables
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      if (process.env[varName].includes('your_') || process.env[varName].includes('your-')) {
        logWarning(`${varName} contains placeholder values (optional)`);
      } else {
        logSuccess(`${varName} is configured (optional)`);
      }
    } else {
      logInfo(`${varName} not set (optional for basic auth testing)`);
    }
  }
  
  return allRequired;
}

async function checkSupabaseConnection() {
  logHeader('Testing Supabase Connection');
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    logError('Cannot test Supabase - missing required environment variables');
    return false;
  }
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    // Test basic connection
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.message.includes('relation "profiles" does not exist')) {
        logError('Database schema not set up - run the SQL from /infra/supabase.sql');
        return false;
      } else {
        logError(`Database connection error: ${error.message}`);
        return false;
      }
    }
    
    logSuccess('Supabase connection successful');
    logSuccess('Database schema appears to be set up correctly');
    
    // Test auth configuration
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      logError(`Auth configuration error: ${authError.message}`);
      return false;
    }
    
    logSuccess('Supabase Auth is configured correctly');
    return true;
    
  } catch (error) {
    logError(`Failed to connect to Supabase: ${error.message}`);
    return false;
  }
}

async function checkEmailProvider() {
  logHeader('Auth Provider Configuration');
  
  logInfo('Please verify in your Supabase dashboard:');
  console.log(`  ${colors.cyan}1. Go to Authentication > Providers${colors.reset}`);
  console.log(`  ${colors.cyan}2. Ensure Email provider is enabled${colors.reset}`);
  console.log(`  ${colors.cyan}3. Check that "Confirm email" is enabled for production${colors.reset}`);
  console.log(`  ${colors.cyan}4. Add your domain to "Site URL" in Auth settings${colors.reset}`);
  
  return true;
}

function checkProjectStructure() {
  logHeader('Project Structure Verification');
  
  const requiredFiles = [
    'apps/web/src/app/auth/callback/route.ts',
    'apps/web/src/components/auth/auth-button.tsx', 
    'apps/web/src/lib/supabase/client.ts',
    'apps/web/src/lib/supabase/server.ts',
    'infra/supabase.sql'
  ];
  
  let allPresent = true;
  
  for (const filePath of requiredFiles) {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      logSuccess(`${filePath} exists`);
    } else {
      logError(`${filePath} is missing`);
      allPresent = false;
    }
  }
  
  return allPresent;
}

function provideInstructions(envOk, supabaseOk, structureOk) {
  logHeader('Next Steps');
  
  if (!structureOk) {
    logError('Project structure is incomplete. This may indicate a corrupted installation.');
    console.log('\nTry running: pnpm install');
    return;
  }
  
  if (!envOk) {
    logWarning('Environment variables need to be configured:');
    console.log('\n1. Copy .env.example to .env.local:');
    console.log('   cp .env.example .env.local\n');
    console.log('2. Edit .env.local and replace placeholder values with real ones from:');
    console.log('   - Supabase Dashboard (Settings > API)');
    console.log('   - Your domain/deployment URL\n');
  }
  
  if (!supabaseOk) {
    logWarning('Supabase needs to be configured:');
    console.log('\n1. Create a new project at https://supabase.com/dashboard/new');
    console.log('2. Go to SQL Editor and run the schema from /infra/supabase.sql');
    console.log('3. Go to Authentication > Providers and enable Email provider');
    console.log('4. Update your .env.local with the correct Supabase URL and keys\n');
  }
  
  if (envOk && supabaseOk) {
    logSuccess('Setup looks good! Try testing authentication:');
    console.log('\n1. Run: pnpm dev');
    console.log('2. Go to http://localhost:3000/auth');
    console.log('3. Enter your email and check for the magic link\n');
    
    logInfo('For production deployment:');
    console.log('1. Set all environment variables in Vercel Dashboard');
    console.log('2. Make sure APP_BASE_URL points to your live domain');
    console.log('3. Add your domain to Supabase Auth settings > Site URL');
  }
}

async function main() {
  console.log(colors.bold + colors.blue + '\nLive Translator Setup Verification' + colors.reset);
  console.log(colors.blue + '===================================\n' + colors.reset);
  
  const structureOk = checkProjectStructure();
  const envOk = await checkEnvironmentVariables();
  const supabaseOk = envOk ? await checkSupabaseConnection() : false;
  await checkEmailProvider();
  
  provideInstructions(envOk, supabaseOk, structureOk);
  
  if (envOk && supabaseOk && structureOk) {
    console.log(colors.green + colors.bold + '\n🎉 Setup verification complete!' + colors.reset);
    process.exit(0);
  } else {
    console.log(colors.red + colors.bold + '\n❌ Setup needs attention before authentication will work.' + colors.reset);
    process.exit(1);
  }
}

// Load environment variables
const dotenv = require('dotenv');
const envPath = path.join(process.cwd(), 'apps/web/.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logInfo(`Loaded environment from ${envPath}`);
} else {
  logWarning('No .env.local file found - using system environment variables only');
}

main().catch(error => {
  logError(`Setup check failed: ${error.message}`);
  process.exit(1);
});