import '@testing-library/jest-dom/vitest';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local first so real credentials take precedence
config({ path: path.resolve(process.cwd(), '.env.local') });

// Set up fallback environment variables for tests (only if not already set)
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

