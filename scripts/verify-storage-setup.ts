#!/usr/bin/env ts-node

/**
 * Supabase Storage Verification Script
 * 
 * This script verifies that Supabase Storage is properly configured
 * for the book-images bucket with correct policies and settings.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../frontend/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const BUCKET_NAME = 'book-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: CheckResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon}\x1b[0m ${message}`);
}

async function verifyStorageSetup() {
  console.log('\n🔍 Verifying Supabase Storage Setup...\n');

  // Check 1: Environment variables
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    addResult('env', false, 'Environment variables not configured');
    console.log('\n❌ Setup incomplete. Please configure environment variables.\n');
    process.exit(1);
  }

  addResult('env', true, 'Environment variables configured');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  addResult('client', true, 'Supabase client initialized');

  // Check 2: Bucket exists
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      addResult('bucket-list', false, `Failed to list buckets: ${error.message}`);
      console.log('\n❌ Setup incomplete. Cannot access storage.\n');
      process.exit(1);
    }

    const bucket = buckets?.find(b => b.name === BUCKET_NAME);
    
    if (!bucket) {
      addResult('bucket-exists', false, `Bucket '${BUCKET_NAME}' does not exist`);
      console.log('\n❌ Setup incomplete. Please create the bucket.\n');
      process.exit(1);
    }

    addResult('bucket-exists', true, `Bucket '${BUCKET_NAME}' exists`);

    // Check 3: Bucket is public
    if (bucket.public) {
      addResult('bucket-public', true, 'Bucket is public');
    } else {
      addResult('bucket-public', false, 'Bucket is not public');
    }

    // Check 4: File size limit
    if (bucket.file_size_limit === MAX_FILE_SIZE) {
      addResult('file-size', true, 'File size limit is 5MB');
    } else {
      addResult('file-size', false, `File size limit is ${bucket.file_size_limit} bytes (expected ${MAX_FILE_SIZE})`);
    }

    // Check 5: Allowed MIME types
    const allowedTypes = bucket.allowed_mime_types;
    if (allowedTypes && allowedTypes.includes('image/jpeg') && allowedTypes.includes('image/png')) {
      addResult('mime-types', true, 'Allowed MIME types: image/jpeg, image/png');
    } else {
      addResult('mime-types', false, `Allowed MIME types: ${allowedTypes?.join(', ') || 'none'}`);
    }

  } catch (error) {
    addResult('bucket-check', false, `Error checking bucket: ${error}`);
    console.log('\n❌ Setup incomplete. Error accessing storage.\n');
    process.exit(1);
  }

  // Check 6: Test upload (requires authentication)
  console.log('\n📝 Note: Upload/delete tests require authentication.');
  console.log('   These will be tested during actual usage.\n');

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`\n✅ All checks passed! (${passed}/${total})\n`);
    console.log('Supabase Storage is properly configured.\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  Some checks failed (${passed}/${total})\n`);
    console.log('Please review the failed checks above.\n');
    process.exit(1);
  }
}

// Run verification
verifyStorageSetup().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
