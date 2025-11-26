#!/usr/bin/env ts-node
/**
 * Setup verification script
 * Run: npx ts-node scripts/verify-setup.ts
 */

const requiredEnvVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_NUMBER',
  'PERSON_NUMBER',
  'CONTACT_NUMBER',
  'DEEPSEEK_API_KEY',
  'CHECKIN_DATABASE_URL',
];

const optionalEnvVars = [
  'NEXT_PUBLIC_BASE_URL',
  'CRON_SECRET',
];

console.log('🔍 Verifying Daily Check-In Service Setup...\n');

let hasErrors = false;

// Check required variables
console.log('Required Environment Variables:');
requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
    hasErrors = true;
  }
});

// Check optional variables
console.log('\nOptional Environment Variables:');
optionalEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (value) {
    console.log(`  ✅ ${varName}: Set`);
  } else {
    console.log(`  ⚠️  ${varName}: Not set (optional)`);
  }
});

// Check database configuration
console.log('\nDatabase Configuration:');
const hasDatabaseUrl = !!process.env.CHECKIN_DATABASE_URL;

if (hasDatabaseUrl) {
  console.log('  ✅ CHECKIN_DATABASE_URL: Set (Neon Postgres)');
} else {
  console.log('  ❌ CHECKIN_DATABASE_URL: Missing (required for Neon Postgres)');
  hasErrors = true;
}

if (hasErrors) {
  console.log('\n❌ Setup incomplete. Please configure missing environment variables.');
  process.exit(1);
} else {
  console.log('\n✅ Setup looks good!');
  console.log('\nNext steps:');
  console.log('  1. Run the database schema: psql $CHECKIN_DATABASE_URL < schema.sql');
  console.log('  2. Start the dev server: npm run dev');
  console.log('  3. Test a call: POST /api/call/start');
}

