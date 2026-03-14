/**
 * Next.js Middleware
 * 
 * This middleware runs on every request and handles:
 * - Supabase session refresh
 * - Authentication state management
 */

export { middleware, config } from './src/lib/supabase/middleware';
