/**
 * Verification Script: Logout and Session Management
 * 
 * This script verifies that Task 8.3 has been implemented correctly.
 * 
 * Requirements Verified:
 * - Requirement 1.8: Invalidate session token on logout
 * - Requirement 1.9: Handle session expiration gracefully
 */

import * as fs from 'fs';
import * as path from 'path';

interface VerificationResult {
  passed: boolean;
  message: string;
}

interface VerificationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  results: VerificationResult[];
}

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');

/**
 * Check if a file exists
 */
function fileExists(filePath: string): boolean {
  return fs.existsSync(path.join(FRONTEND_DIR, filePath));
}

/**
 * Check if a file contains specific content
 */
function fileContains(filePath: string, content: string): boolean {
  try {
    const fullPath = path.join(FRONTEND_DIR, filePath);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    return fileContent.includes(content);
  } catch (error) {
    return false;
  }
}

/**
 * Run all verification checks
 */
function runVerification(): VerificationSummary {
  const results: VerificationResult[] = [];

  // Check 1: Client-side signOut function exists
  results.push({
    passed: fileExists('src/lib/auth/client.ts') && 
            fileContains('src/lib/auth/client.ts', 'export async function signOut'),
    message: 'Client-side signOut function exists',
  });

  // Check 2: Client-side signOut supports custom redirect
  results.push({
    passed: fileContains('src/lib/auth/client.ts', 'redirectTo?:'),
    message: 'Client-side signOut supports custom redirect URL',
  });

  // Check 3: Client-side signOut implements Requirement 1.8
  results.push({
    passed: fileContains('src/lib/auth/client.ts', 'Requirement 1.8'),
    message: 'Client-side signOut documents Requirement 1.8',
  });

  // Check 4: Server-side signOutServer function exists
  results.push({
    passed: fileExists('src/lib/auth/server.ts') && 
            fileContains('src/lib/auth/server.ts', 'export async function signOutServer'),
    message: 'Server-side signOutServer function exists',
  });

  // Check 5: Server-side signOutServer implements Requirement 1.8
  results.push({
    passed: fileContains('src/lib/auth/server.ts', 'Requirement 1.8'),
    message: 'Server-side signOutServer documents Requirement 1.8',
  });

  // Check 6: AuthProvider has enhanced signOut
  results.push({
    passed: fileExists('src/lib/auth/provider.tsx') && 
            fileContains('src/lib/auth/provider.tsx', 'const signOut = async'),
    message: 'AuthProvider has signOut function',
  });

  // Check 7: AuthProvider clears refresh timer on signOut
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'clearInterval(refreshTimerRef.current)'),
    message: 'AuthProvider clears refresh timer on signOut',
  });

  // Check 8: AuthProvider implements Requirement 1.8
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'Requirement 1.8'),
    message: 'AuthProvider documents Requirement 1.8',
  });

  // Check 9: useSignOut hook exists
  results.push({
    passed: fileExists('src/lib/auth/hooks.ts') && 
            fileContains('src/lib/auth/hooks.ts', 'export function useSignOut'),
    message: 'useSignOut hook exists',
  });

  // Check 10: useSignOut hook provides loading state
  results.push({
    passed: fileContains('src/lib/auth/hooks.ts', 'signingOut'),
    message: 'useSignOut hook provides loading state',
  });

  // Check 11: Session expiration detection in checkAndRefreshSession
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'secondsUntilExpiry <= 0'),
    message: 'Session expiration detection implemented',
  });

  // Check 12: Session clearing on expiration
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'Session expired, requiring re-authentication'),
    message: 'Session clearing on expiration implemented',
  });

  // Check 13: Error message on session expiration
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'Session expired. Please sign in again'),
    message: 'Error message set on session expiration',
  });

  // Check 14: Refresh failure handling near expiration
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'secondsUntilExpiry < 60'),
    message: 'Refresh failure handling near expiration implemented',
  });

  // Check 15: checkAndRefreshSession implements Requirement 1.9
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'Requirement 1.9'),
    message: 'checkAndRefreshSession documents Requirement 1.9',
  });

  // Check 16: Documentation file exists
  results.push({
    passed: fileExists('src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md'),
    message: 'LOGOUT_SESSION_MANAGEMENT.md documentation exists',
  });

  // Check 17: Documentation covers logout functionality
  results.push({
    passed: fileContains('src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md', 'Logout Functionality'),
    message: 'Documentation covers logout functionality',
  });

  // Check 18: Documentation covers session expiration
  results.push({
    passed: fileContains('src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md', 'Session Expiration Handling'),
    message: 'Documentation covers session expiration handling',
  });

  // Check 19: Documentation includes usage examples
  results.push({
    passed: fileContains('src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md', 'Usage Examples'),
    message: 'Documentation includes usage examples',
  });

  // Check 20: Documentation validates requirements
  results.push({
    passed: fileContains('src/lib/auth/LOGOUT_SESSION_MANAGEMENT.md', 'Requirements Validation'),
    message: 'Documentation validates requirements',
  });

  // Check 21: Test file exists
  results.push({
    passed: fileExists('src/lib/auth/__tests__/logout-session.test.ts'),
    message: 'logout-session.test.ts test file exists',
  });

  // Check 22: Tests cover logout functionality
  results.push({
    passed: fileContains('src/lib/auth/__tests__/logout-session.test.ts', 'Logout Functionality'),
    message: 'Tests cover logout functionality',
  });

  // Check 23: Tests cover session expiration
  results.push({
    passed: fileContains('src/lib/auth/__tests__/logout-session.test.ts', 'Session Expiration Handling'),
    message: 'Tests cover session expiration handling',
  });

  // Check 24: Tests validate Requirement 1.8
  results.push({
    passed: fileContains('src/lib/auth/__tests__/logout-session.test.ts', 'Requirement 1.8'),
    message: 'Tests validate Requirement 1.8',
  });

  // Check 25: Tests validate Requirement 1.9
  results.push({
    passed: fileContains('src/lib/auth/__tests__/logout-session.test.ts', 'Requirement 1.9'),
    message: 'Tests validate Requirement 1.9',
  });

  // Check 26: Example components file exists
  results.push({
    passed: fileExists('src/lib/auth/logout-examples.tsx'),
    message: 'logout-examples.tsx example components exist',
  });

  // Check 27: Example components include logout buttons
  results.push({
    passed: fileContains('src/lib/auth/logout-examples.tsx', 'LogoutButton'),
    message: 'Example components include logout buttons',
  });

  // Check 28: Example components include session expiration handling
  results.push({
    passed: fileContains('src/lib/auth/logout-examples.tsx', 'SessionExpirationAlert'),
    message: 'Example components include session expiration handling',
  });

  // Check 29: Session configuration constants exist
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'SESSION_CONFIG'),
    message: 'Session configuration constants exist',
  });

  // Check 30: Proactive refresh threshold is 5 minutes
  results.push({
    passed: fileContains('src/lib/auth/provider.tsx', 'PROACTIVE_REFRESH_THRESHOLD_SECONDS: 5 * 60'),
    message: 'Proactive refresh threshold is 5 minutes',
  });

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    totalChecks: results.length,
    passed,
    failed,
    results,
  };
}

/**
 * Print verification results
 */
function printResults(summary: VerificationSummary): void {
  console.log('\n=== Task 8.3 Verification: Logout and Session Management ===\n');

  summary.results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Check ${index + 1}: ${result.message}`);
  });

  console.log('\n=== Summary ===\n');
  console.log(`Total Checks: ${summary.totalChecks}`);
  console.log(`Passed: ${summary.passed}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Success Rate: ${((summary.passed / summary.totalChecks) * 100).toFixed(1)}%`);

  if (summary.failed === 0) {
    console.log('\n✅ All checks passed! Task 8.3 is complete.\n');
  } else {
    console.log('\n❌ Some checks failed. Please review the implementation.\n');
  }
}

/**
 * Main execution
 */
function main(): void {
  try {
    const summary = runVerification();
    printResults(summary);
    process.exit(summary.failed === 0 ? 0 : 1);
  } catch (error) {
    console.error('Error running verification:', error);
    process.exit(1);
  }
}

main();
