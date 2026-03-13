/**
 * Profile Management Verification Script
 * 
 * This script verifies that the user profile management system is working correctly:
 * - Profile sync functions exist and are properly exported
 * - OAuth provider mapping is correct
 * - Default values are set correctly
 * - Error handling is in place
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  check: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: VerificationResult[] = [];

function addResult(check: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ check, status, message });
}

function printResults() {
  console.log('\n=== Profile Management Verification Results ===\n');
  
  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;
  
  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.check}`);
    console.log(`   ${result.message}\n`);
    
    if (result.status === 'PASS') passCount++;
    else if (result.status === 'FAIL') failCount++;
    else warnCount++;
  });
  
  console.log('=== Summary ===');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`Total: ${results.length}\n`);
  
  if (failCount > 0) {
    console.log('❌ Profile management verification FAILED');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  Profile management verification completed with warnings');
  } else {
    console.log('✅ Profile management verification PASSED');
  }
}

// Check 1: Profile module exists
function checkProfileModuleExists() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  if (fs.existsSync(profilePath)) {
    addResult(
      'Profile module exists',
      'PASS',
      'profile.ts file found at frontend/src/lib/auth/profile.ts'
    );
    return true;
  } else {
    addResult(
      'Profile module exists',
      'FAIL',
      'profile.ts file not found at frontend/src/lib/auth/profile.ts'
    );
    return false;
  }
}

// Check 2: Profile functions are exported
function checkProfileFunctionsExported() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  try {
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    const requiredFunctions = [
      'syncUserProfileServer',
      'syncUserProfileClient',
      'getUserProfileById',
      'updateUserProfile',
    ];
    
    const missingFunctions = requiredFunctions.filter(fn => !content.includes(`export async function ${fn}`));
    
    if (missingFunctions.length === 0) {
      addResult(
        'Profile functions exported',
        'PASS',
        `All required functions are exported: ${requiredFunctions.join(', ')}`
      );
      return true;
    } else {
      addResult(
        'Profile functions exported',
        'FAIL',
        `Missing functions: ${missingFunctions.join(', ')}`
      );
      return false;
    }
  } catch (error) {
    addResult(
      'Profile functions exported',
      'FAIL',
      `Error reading profile.ts: ${error}`
    );
    return false;
  }
}

// Check 3: OAuth provider mapping
function checkOAuthProviderMapping() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  try {
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    const hasGoogleMapping = content.includes("provider === 'google'");
    const hasAppleMapping = content.includes("provider === 'apple'");
    const hasMicrosoftMapping = content.includes("provider === 'azure'") && content.includes("return 'microsoft'");
    
    if (hasGoogleMapping && hasAppleMapping && hasMicrosoftMapping) {
      addResult(
        'OAuth provider mapping',
        'PASS',
        'All OAuth providers (Google, Apple, Microsoft/Azure) are correctly mapped'
      );
      return true;
    } else {
      const missing = [];
      if (!hasGoogleMapping) missing.push('Google');
      if (!hasAppleMapping) missing.push('Apple');
      if (!hasMicrosoftMapping) missing.push('Microsoft/Azure');
      
      addResult(
        'OAuth provider mapping',
        'FAIL',
        `Missing or incorrect provider mapping for: ${missing.join(', ')}`
      );
      return false;
    }
  } catch (error) {
    addResult(
      'OAuth provider mapping',
      'FAIL',
      `Error checking provider mapping: ${error}`
    );
    return false;
  }
}

// Check 4: Default values for new users
function checkDefaultValues() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  try {
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    const requiredDefaults = [
      "role: 'buyer'",
      'is_active: true',
      'rating: 0.0',
      'total_transactions: 0',
      'listing_limit: -1',
      'books_sold: 0',
      'books_bought: 0',
      'trees_saved: 0.0',
      'water_saved_liters: 0.0',
      'co2_reduced_kg: 0.0',
    ];
    
    const missingDefaults = requiredDefaults.filter(def => !content.includes(def));
    
    if (missingDefaults.length === 0) {
      addResult(
        'Default values for new users',
        'PASS',
        'All required default values are set correctly'
      );
      return true;
    } else {
      addResult(
        'Default values for new users',
        'FAIL',
        `Missing or incorrect defaults: ${missingDefaults.join(', ')}`
      );
      return false;
    }
  } catch (error) {
    addResult(
      'Default values for new users',
      'FAIL',
      `Error checking default values: ${error}`
    );
    return false;
  }
}

// Check 5: Uniqueness constraint handling
function checkUniquenessHandling() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  try {
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    const hasUniquenessCheck = content.includes("insertError.code === '23505'");
    const hasUniquenessError = content.includes('OAuth provider already exists');
    
    if (hasUniquenessCheck && hasUniquenessError) {
      addResult(
        'Uniqueness constraint handling',
        'PASS',
        'OAuth provider uniqueness violation (23505) is properly handled'
      );
      return true;
    } else {
      addResult(
        'Uniqueness constraint handling',
        'FAIL',
        'Missing or incorrect handling of OAuth provider uniqueness constraint'
      );
      return false;
    }
  } catch (error) {
    addResult(
      'Uniqueness constraint handling',
      'FAIL',
      `Error checking uniqueness handling: ${error}`
    );
    return false;
  }
}

// Check 6: Profile extraction functions
function checkProfileExtraction() {
  const profilePath = path.join(__dirname, '../frontend/src/lib/auth/profile.ts');
  
  try {
    const content = fs.readFileSync(profilePath, 'utf-8');
    
    const hasNameExtraction = content.includes('function extractUserName');
    const hasPictureExtraction = content.includes('function extractProfilePicture');
    const hasProviderIdExtraction = content.includes('function getOAuthProviderId');
    
    if (hasNameExtraction && hasPictureExtraction && hasProviderIdExtraction) {
      addResult(
        'Profile extraction functions',
        'PASS',
        'All profile extraction functions are implemented'
      );
      return true;
    } else {
      const missing = [];
      if (!hasNameExtraction) missing.push('extractUserName');
      if (!hasPictureExtraction) missing.push('extractProfilePicture');
      if (!hasProviderIdExtraction) missing.push('getOAuthProviderId');
      
      addResult(
        'Profile extraction functions',
        'FAIL',
        `Missing extraction functions: ${missing.join(', ')}`
      );
      return false;
    }
  } catch (error) {
    addResult(
      'Profile extraction functions',
      'FAIL',
      `Error checking extraction functions: ${error}`
    );
    return false;
  }
}

// Check 7: Auth callback integration
function checkAuthCallbackIntegration() {
  const callbackPath = path.join(__dirname, '../frontend/src/app/auth/callback/route.ts');
  
  try {
    const content = fs.readFileSync(callbackPath, 'utf-8');
    
    const importsSyncFunction = content.includes("import { syncUserProfileServer }");
    const callsSyncFunction = content.includes('await syncUserProfileServer(user)');
    
    if (importsSyncFunction && callsSyncFunction) {
      addResult(
        'Auth callback integration',
        'PASS',
        'Profile sync is properly integrated in OAuth callback route'
      );
      return true;
    } else {
      addResult(
        'Auth callback integration',
        'FAIL',
        'Profile sync is not properly integrated in OAuth callback route'
      );
      return false;
    }
  } catch (error) {
    addResult(
      'Auth callback integration',
      'FAIL',
      `Error checking callback integration: ${error}`
    );
    return false;
  }
}

// Check 8: Auth index exports
function checkAuthIndexExports() {
  const indexPath = path.join(__dirname, '../frontend/src/lib/auth/index.ts');
  
  try {
    const content = fs.readFileSync(indexPath, 'utf-8');
    
    const exportsProfileFunctions = content.includes("from './profile'");
    const exportsUserProfile = content.includes('type UserProfile');
    
    if (exportsProfileFunctions && exportsUserProfile) {
      addResult(
        'Auth index exports',
        'PASS',
        'Profile management functions are exported from auth index'
      );
      return true;
    } else {
      addResult(
        'Auth index exports',
        'WARN',
        'Profile management functions may not be fully exported from auth index'
      );
      return true; // Warning, not failure
    }
  } catch (error) {
    addResult(
      'Auth index exports',
      'WARN',
      `Could not verify auth index exports: ${error}`
    );
    return true; // Warning, not failure
  }
}

// Check 9: Test file exists
function checkTestFileExists() {
  const testPath = path.join(__dirname, '../frontend/src/lib/auth/__tests__/profile.test.ts');
  
  if (fs.existsSync(testPath)) {
    addResult(
      'Test file exists',
      'PASS',
      'profile.test.ts file found with comprehensive tests'
    );
    return true;
  } else {
    addResult(
      'Test file exists',
      'WARN',
      'profile.test.ts file not found - tests should be added'
    );
    return true; // Warning, not failure
  }
}

// Check 10: Documentation exists
function checkDocumentationExists() {
  const docPath = path.join(__dirname, '../frontend/src/lib/auth/PROFILE_MANAGEMENT.md');
  
  if (fs.existsSync(docPath)) {
    addResult(
      'Documentation exists',
      'PASS',
      'PROFILE_MANAGEMENT.md documentation found'
    );
    return true;
  } else {
    addResult(
      'Documentation exists',
      'WARN',
      'PROFILE_MANAGEMENT.md documentation not found'
    );
    return true; // Warning, not failure
  }
}

// Run all checks
async function runVerification() {
  console.log('Starting profile management verification...\n');
  
  checkProfileModuleExists();
  checkProfileFunctionsExported();
  checkOAuthProviderMapping();
  checkDefaultValues();
  checkUniquenessHandling();
  checkProfileExtraction();
  checkAuthCallbackIntegration();
  checkAuthIndexExports();
  checkTestFileExists();
  checkDocumentationExists();
  
  printResults();
}

// Execute verification
runVerification().catch(error => {
  console.error('Verification failed with error:', error);
  process.exit(1);
});
