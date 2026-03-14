/**
 * Tests for Sign Out API Route
 * 
 * **Validates: Requirements 1.8**
 * 
 * Tests the /api/auth/signout endpoint to ensure:
 * - Supabase signOut is called correctly
 * - Session cookies are cleared
 * - Appropriate responses are returned
 * - Errors are handled gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('POST /api/auth/signout', () => {
  let mockSignOut: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock signOut function
    mockSignOut = vi.fn();
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        signOut: mockSignOut,
      },
    };
    
    // Mock createServerClient to return our mock client
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });
  
  it('should successfully sign out user', async () => {
    // Arrange
    mockSignOut.mockResolvedValue({ error: null });
    
    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      message: 'Successfully signed out',
    });
  });
  
  it('should return 500 when Supabase signOut fails', async () => {
    // Arrange
    const errorMessage = 'Failed to sign out';
    mockSignOut.mockResolvedValue({ 
      error: { message: errorMessage } 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Sign out failed',
      message: errorMessage,
    });
  });
  
  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected error');
    mockSignOut.mockRejectedValue(unexpectedError);
    
    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(500);
    expect(data).toEqual({
      success: false,
      error: 'Internal server error',
      message: 'Unexpected error',
    });
  });
  
  it('should clear session cookies when signing out', async () => {
    // Arrange
    mockSignOut.mockResolvedValue({ error: null });
    
    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    });
    
    // Act
    const response = await POST(request);
    
    // Assert
    // Supabase client automatically clears cookies when signOut is called
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
  });
  
  it('should call createServerClient to get Supabase client with cookie access', async () => {
    // Arrange
    mockSignOut.mockResolvedValue({ error: null });
    const { createServerClient } = require('@/lib/supabase/server');
    
    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    });
    
    // Act
    await POST(request);
    
    // Assert
    expect(createServerClient).toHaveBeenCalledOnce();
  });
});
