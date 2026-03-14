/**
 * Tests for /api/admin/listings/[id]/approve route
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PUT } from '../route';
import { NextRequest } from 'next/server';
import * as middleware from '@/lib/auth/middleware';
import * as adminApprovalService from '@/services/admin-approval.service';

// Mock dependencies - use factory functions to prevent module evaluation
vi.mock('@/lib/auth/middleware', () => ({
  requireAdmin: vi.fn(),
}));
vi.mock('@/services/admin-approval.service', () => ({
  processAdminApproval: vi.fn(),
  getPendingListings: vi.fn(),
}));

describe('PUT /api/admin/listings/[id]/approve', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockListing = {
    id: 'listing-123',
    book_id: 'book-123',
    seller_id: 'seller-123',
    status: 'active',
    approved_at: '2024-01-01T00:00:00Z',
    approved_by: 'admin-123',
    original_price: 500,
    final_price: 450,
    condition_score: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      }) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 if user is not admin', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: false,
      response: new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
        status: 403,
      }) as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should approve listing successfully', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: true,
      listing: mockListing,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockListing);
    expect(data.message).toBe('Listing approved successfully');
    
    expect(adminApprovalService.processAdminApproval).toHaveBeenCalledWith({
      listingId: 'listing-123',
      adminId: 'admin-123',
      action: 'approve',
    });
  });

  it('should return 404 if listing not found', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: false,
      error: 'Listing not found',
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/invalid-id/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'invalid-id' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Listing not found');
  });

  it('should return 400 if listing status is invalid', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: false,
      error: 'Listing status must be pending_approval or rescan_required, current status: active',
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('status must be');
  });

  it('should return 500 on service error', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: false,
      error: 'Database connection failed',
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/approve', {
      method: 'PUT',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database connection failed');
  });
});
