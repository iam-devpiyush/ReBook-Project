/**
 * Tests for Get Current User API Route
 * 
 * **Validates: User profile access requirement**
 * 
 * Tests the /api/auth/me endpoint to ensure:
 * - Returns authenticated user profile correctly
 * - Includes eco_impact metrics
 * - Returns 401 for unauthenticated requests
 * - Returns 404 when user profile not found
 * - Handles errors gracefully
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('GET /api/auth/me', () => {
  let mockGetUser: ReturnType<typeof vi.fn>;
  let mockFrom: ReturnType<typeof vi.fn>;
  let mockSelect: ReturnType<typeof vi.fn>;
  let mockEq: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockSupabaseClient: any;
  
  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    aud: 'authenticated',
  };
  
  const mockProfile = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    name: 'Test User',
    profile_picture: 'https://example.com/avatar.jpg',
    role: 'seller',
    oauth_provider: 'google',
    
    // Location
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400001',
    latitude: 19.0760,
    longitude: 72.8777,
    
    // User metrics
    rating: 4.5,
    total_transactions: 10,
    
    // Admin controls
    is_active: true,
    suspended_until: null,
    listing_limit: -1,
    
    // Environmental impact
    books_sold: 5,
    books_bought: 3,
    trees_saved: 0.27,
    water_saved_liters: 400.0,
    co2_reduced_kg: 20.0,
    
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock functions
    mockGetUser = vi.fn();
    mockFrom = vi.fn();
    mockSelect = vi.fn();
    mockEq = vi.fn();
    mockSingle = vi.fn();
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    };
    
    // Setup query chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    
    // Mock createServerClient to return our mock client
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });
  
  it('should return authenticated user profile with eco_impact', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    mockSingle.mockResolvedValue({ 
      data: mockProfile, 
      error: null 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('id', mockUser.id);
    expect(mockSingle).toHaveBeenCalledOnce();
    
    expect(response.status).toBe(200);
    expect(data.user).toEqual({
      id: mockProfile.id,
      email: mockProfile.email,
      name: mockProfile.name,
      profile_picture: mockProfile.profile_picture,
      role: mockProfile.role,
      oauth_provider: mockProfile.oauth_provider,
      
      city: mockProfile.city,
      state: mockProfile.state,
      pincode: mockProfile.pincode,
      latitude: mockProfile.latitude,
      longitude: mockProfile.longitude,
      
      rating: mockProfile.rating,
      total_transactions: mockProfile.total_transactions,
      
      is_active: mockProfile.is_active,
      suspended_until: mockProfile.suspended_until,
      listing_limit: mockProfile.listing_limit,
      
      eco_impact: {
        books_sold: mockProfile.books_sold,
        books_bought: mockProfile.books_bought,
        trees_saved: mockProfile.trees_saved,
        water_saved_liters: mockProfile.water_saved_liters,
        co2_reduced_kg: mockProfile.co2_reduced_kg,
      },
      
      created_at: mockProfile.created_at,
      updated_at: mockProfile.updated_at,
    });
  });
  
  it('should return 401 when user is not authenticated', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: null }, 
      error: { message: 'Not authenticated' } 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(data).toEqual({
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource',
    });
  });
  
  it('should return 401 when auth error occurs', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: null }, 
      error: { message: 'Invalid token' } 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
  
  it('should return 404 when user profile not found in database', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    mockSingle.mockResolvedValue({ 
      data: null, 
      error: { code: 'PGRST116', message: 'No rows found' } 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledWith('users');
    expect(response.status).toBe(404);
    expect(data).toEqual({
      error: 'Not Found',
      message: 'User profile not found',
    });
  });
  
  it('should return 500 when database error occurs', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    mockSingle.mockResolvedValue({ 
      data: null, 
      error: { code: 'PGRST000', message: 'Database connection failed' } 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Database error',
      message: 'Database connection failed',
    });
  });
  
  it('should handle unexpected errors gracefully', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected error');
    mockGetUser.mockRejectedValue(unexpectedError);
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: 'Internal server error',
      message: 'Unexpected error',
    });
  });
  
  it('should include all eco_impact metrics in response', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    mockSingle.mockResolvedValue({ 
      data: mockProfile, 
      error: null 
    });
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    const response = await GET(request);
    const data = await response.json();
    
    // Assert
    expect(data.user.eco_impact).toEqual({
      books_sold: 5,
      books_bought: 3,
      trees_saved: 0.27,
      water_saved_liters: 400.0,
      co2_reduced_kg: 20.0,
    });
  });
  
  it('should call createServerClient to get Supabase client', async () => {
    // Arrange
    mockGetUser.mockResolvedValue({ 
      data: { user: mockUser }, 
      error: null 
    });
    mockSingle.mockResolvedValue({ 
      data: mockProfile, 
      error: null 
    });
    const { createServerClient } = require('@/lib/supabase/server');
    
    const request = new NextRequest('http://localhost:3000/api/auth/me', {
      method: 'GET',
    });
    
    // Act
    await GET(request);
    
    // Assert
    expect(createServerClient).toHaveBeenCalledOnce();
  });
});
