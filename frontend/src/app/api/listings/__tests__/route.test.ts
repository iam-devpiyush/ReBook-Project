/**
 * Tests for /api/listings API route
 * 
 * Tests POST endpoint for creating listings
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  requireSeller: vi.fn(),
}));

describe('POST /api/listings', () => {
  let mockSupabaseClient: any;
  let mockRequireSeller: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock Supabase client
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      in: vi.fn().mockReturnThis(),
    };
    
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
    
    mockRequireSeller = require('@/lib/auth/middleware').requireSeller;
  });
  
  it('should return 401 if seller is not authenticated', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });
  
  it('should return 400 if validation fails', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify({
        title: '', // Invalid: empty title
        author: 'Test Author',
      }),
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details).toBeDefined();
  });
  
  it('should return 403 if seller has reached listing limit', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { listing_limit: 5 },
      error: null,
    });
    
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        count: 5,
        error: null,
      }),
    });
    
    const validListing = {
      title: 'Test Book',
      author: 'Test Author',
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      original_price: 100,
      condition_score: 4,
      images: ['https://example.com/image1.jpg'],
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      final_price: 120,
      delivery_cost: 50,
      platform_commission: 10,
      payment_fees: 5,
      seller_payout: 90,
    };
    
    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify(validListing),
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(403);
    expect(data.error).toBe('Listing limit reached');
  });
  
  it('should create listing with status pending_approval', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    // Mock seller profile check
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { listing_limit: -1 }, // Unlimited
      error: null,
    });
    
    // Mock book creation
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { id: 'book-123' },
      error: null,
    });
    
    // Mock listing creation
    const mockListing = {
      id: 'listing-123',
      book_id: 'book-123',
      seller_id: 'user-123',
      status: 'pending_approval',
      original_price: 100,
      condition_score: 4,
      final_price: 120,
      delivery_cost: 50,
      platform_commission: 10,
      payment_fees: 5,
      seller_payout: 90,
      images: ['https://example.com/image1.jpg'],
      created_at: new Date().toISOString(),
    };
    
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: mockListing,
      error: null,
    });
    
    const validListing = {
      title: 'Test Book',
      author: 'Test Author',
      category_id: '123e4567-e89b-12d3-a456-426614174000',
      original_price: 100,
      condition_score: 4,
      images: ['https://example.com/image1.jpg'],
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      final_price: 120,
      delivery_cost: 50,
      platform_commission: 10,
      payment_fees: 5,
      seller_payout: 90,
    };
    
    const request = new NextRequest('http://localhost:3000/api/listings', {
      method: 'POST',
      body: JSON.stringify(validListing),
    });
    
    // Act
    const response = await POST(request);
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('pending_approval');
    expect(data.message).toContain('admin approval');
  });
});
