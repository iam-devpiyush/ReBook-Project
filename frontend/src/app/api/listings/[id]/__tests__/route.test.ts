/**
 * Tests for /api/listings/[id] API route
 * 
 * Tests GET, PUT, DELETE endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/auth/middleware', () => ({
  getUser: vi.fn(),
  requireSeller: vi.fn(),
}));

vi.mock('@/services/search.service', () => ({
  updateMeilisearchIndex: vi.fn().mockResolvedValue(undefined),
  removeFromMeilisearchIndex: vi.fn().mockResolvedValue(undefined),
}));

describe('GET /api/listings/[id]', () => {
  let mockSupabaseClient: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
  });
  
  it('should return 400 for invalid UUID format', async () => {
    // Arrange
    const request = new NextRequest('http://localhost:3000/api/listings/invalid-id');
    const params = { id: 'invalid-id' };
    
    // Act
    const response = await GET(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid listing ID format');
  });
  
  it('should return 404 if listing not found', async () => {
    // Arrange
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'Not found' },
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000');
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await GET(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(404);
    expect(data.error).toBe('Listing not found');
  });
  
  it('should return listing and increment view count', async () => {
    // Arrange
    const mockListing = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Test Book',
      views: 10,
      status: 'active',
    };
    
    mockSupabaseClient.single.mockResolvedValue({
      data: mockListing,
      error: null,
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000');
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await GET(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockListing);
  });
});

describe('PUT /api/listings/[id]', () => {
  let mockSupabaseClient: any;
  let mockRequireSeller: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
    
    mockRequireSeller = require('@/lib/auth/middleware').requireSeller;
  });
  
  it('should return 403 if seller does not own listing', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { seller_id: 'different-user', status: 'active' },
      error: null,
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000', {
      method: 'PUT',
      body: JSON.stringify({ original_price: 150 }),
    });
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await PUT(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(403);
    expect(data.error).toContain('do not own');
  });
  
  it('should return 400 if listing status does not allow editing', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: { seller_id: 'user-123', status: 'sold' },
      error: null,
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000', {
      method: 'PUT',
      body: JSON.stringify({ original_price: 150 }),
    });
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await PUT(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('cannot be edited');
  });
  
  it('should update listing successfully', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single
      .mockResolvedValueOnce({
        data: { seller_id: 'user-123', status: 'active' },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: '123e4567-e89b-12d3-a456-426614174000', original_price: 150 },
        error: null,
      });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000', {
      method: 'PUT',
      body: JSON.stringify({ original_price: 150 }),
    });
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await PUT(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('updated successfully');
  });
});

describe('DELETE /api/listings/[id]', () => {
  let mockSupabaseClient: any;
  let mockRequireSeller: any;
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    };
    
    const { createServerClient } = require('@/lib/supabase/server');
    createServerClient.mockReturnValue(mockSupabaseClient);
    
    mockRequireSeller = require('@/lib/auth/middleware').requireSeller;
  });
  
  it('should return 400 if trying to delete sold listing', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single.mockResolvedValue({
      data: { seller_id: 'user-123', status: 'sold' },
      error: null,
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000', {
      method: 'DELETE',
    });
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(400);
    expect(data.error).toContain('Cannot delete sold listings');
  });
  
  it('should delete listing successfully', async () => {
    // Arrange
    mockRequireSeller.mockResolvedValue({
      success: true,
      user: { id: 'user-123', role: 'seller' },
    });
    
    mockSupabaseClient.single.mockResolvedValue({
      data: { seller_id: 'user-123', status: 'active' },
      error: null,
    });
    
    mockSupabaseClient.eq.mockResolvedValue({
      error: null,
    });
    
    const request = new NextRequest('http://localhost:3000/api/listings/123e4567-e89b-12d3-a456-426614174000', {
      method: 'DELETE',
    });
    const params = { id: '123e4567-e89b-12d3-a456-426614174000' };
    
    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();
    
    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('deleted successfully');
  });
});
