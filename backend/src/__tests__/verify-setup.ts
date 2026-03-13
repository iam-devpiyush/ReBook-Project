/**
 * Test Environment Verification Script
 * 
 * Run this script to verify your test environment is configured correctly.
 * 
 * Usage: npx tsx src/__tests__/verify-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

// Load test environment variables
const envPath = join(__dirname, '../../.env.test');
if (!existsSync(envPath)) {
  console.error('❌ Error: .env.test file not found');
  console.error('   Please create backend/.env.test with your Supabase credentials');
  console.error('   See backend/TESTING.md for setup instructions');
  process.exit(1);
}

dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Verifying test environment setup...\n');

// Check environment variables
console.log('1. Checking environment variables...');
if (!supabaseUrl) {
  console.error('   ❌ SUPABASE_URL is not set');
  process.exit(1);
}
if (!supabaseKey) {
  console.error('   ❌ SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}
console.log('   ✅ Environment variables are set');
console.log(`   📍 URL: ${supabaseUrl}`);

// Check Supabase connection
console.log('\n2. Testing Supabase connection...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyConnection() {
  try {
    // Try to query the categories table
    const { error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);

    if (error) {
      console.error('   ❌ Connection failed:', error.message);
      
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.error('\n   💡 Hint: The database tables do not exist.');
        console.error('      Run migrations to create the schema:');
        console.error('      - For local Supabase: supabase db reset');
        console.error('      - For remote: Apply migrations via Supabase dashboard');
      }
      
      process.exit(1);
    }

    console.log('   ✅ Successfully connected to Supabase');
  } catch (error) {
    console.error('   ❌ Connection error:', error);
    process.exit(1);
  }
}

// Check required tables exist
console.log('\n3. Checking database schema...');
async function verifySchema() {
  const requiredTables = [
    'users',
    'categories',
    'books',
    'listings',
    'orders',
    'payments',
    'shipping',
    'reviews',
    'wishlist',
    'moderation_logs',
    'platform_stats',
    'ai_scans'
  ];

  const missingTables: string[] = [];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1);

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          missingTables.push(table);
        } else {
          console.error(`   ⚠️  Warning: Error checking table '${table}':`, error.message);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Warning: Error checking table '${table}':`, error);
    }
  }

  if (missingTables.length > 0) {
    console.error(`   ❌ Missing tables: ${missingTables.join(', ')}`);
    console.error('\n   💡 Hint: Apply migrations to create the schema:');
    console.error('      - For local Supabase: supabase db reset');
    console.error('      - For remote: Apply migrations via Supabase dashboard');
    process.exit(1);
  }

  console.log('   ✅ All required tables exist');
}

// Check UUID extension
console.log('\n4. Checking PostgreSQL extensions...');
async function verifyExtensions() {
  try {
    // Try to insert a test record to verify UUID generation works
    const testCategory = {
      name: `test_verify_${Date.now()}`,
      type: 'general',
      metadata: {}
    };

    const { data, error } = await supabase
      .from('categories')
      .insert(testCategory)
      .select('id');

    if (error) {
      console.error('   ❌ UUID generation test failed:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) {
      console.error('   ❌ No data returned from insert');
      process.exit(1);
    }

    const id = data[0].id;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(id)) {
      console.error('   ❌ Generated ID is not a valid UUID:', id);
      process.exit(1);
    }

    // Clean up test record
    await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    console.log('   ✅ UUID generation is working correctly');
    console.log(`   📝 Test UUID: ${id}`);
  } catch (error) {
    console.error('   ❌ Extension verification failed:', error);
    process.exit(1);
  }
}

// Run all checks
async function runChecks() {
  try {
    await verifyConnection();
    await verifySchema();
    await verifyExtensions();
    
    console.log('\n✅ All checks passed! Your test environment is ready.');
    console.log('\n📚 Next steps:');
    console.log('   - Run tests: npm test');
    console.log('   - Run property tests: npm run test:properties');
    console.log('   - See TESTING.md for more information');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

runChecks();
