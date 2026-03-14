/**
 * Tests for /api/admin/listings/[id]/reject route
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

describe('PUT /api/admin/listings/[id]/reject', () => {
  const mockAdmin = {
    id: 'admin-123',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockListing = {
    id: 'listing-123',
    book_id: 'book-123',
    seller_id: 'seller-123',
    status: 'rejected',
    rejection_reason: 'Poor image quality',
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'Poor quality' }),
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'Poor quality' }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden: Admin role required');
  });

  it('should return 400 if rejection reason is missing', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({}),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Rejection reason is required');
  });

  it('should return 400 if rejection reason is empty', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: '   ' }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Rejection reason is required');
  });

  it('should return 400 if rejection reason exceeds 500 characters', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const longReason = 'a'.repeat(501);
    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: longReason }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Rejection reason must be 500 characters or less');
  });

  it('should reject listing successfully', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: true,
      listing: mockListing,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'Poor image quality' }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(200);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data).toEqual(mockListing);
    expect(data.message).toBe('Listing rejected successfully');
    
    expect(adminApprovalService.processAdminApproval).toHaveBeenCalledWith({
      listingId: 'listing-123',
      adminId: 'admin-123',
      action: 'reject',
      reason: 'Poor image quality',
    });
  });

  it('should trim rejection reason before processing', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    vi.mocked(adminApprovalService.processAdminApproval).mockResolvedValue({
      success: true,
      listing: mockListing,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: '  Poor image quality  ' }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(200);
    
    expect(adminApprovalService.processAdminApproval).toHaveBeenCalledWith({
      listingId: 'listing-123',
      adminId: 'admin-123',
      action: 'reject',
      reason: 'Poor image quality',
    });
  });

  it('should return 400 for invalid JSON', async () => {
    vi.mocked(middleware.requireAdmin).mockResolvedValue({
      success: true,
      user: mockAdmin as any,
    });

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: 'invalid json',
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid JSON in request body');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings/invalid-id/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'Poor quality' }),
    });
    
    const response = await PUT(request, { params: { id: 'invalid-id' } });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Listing not found');
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

    const request = new NextRequest('http://localhost:3000/api/admin/listings/listing-123/reject', {
      method: 'PUT',
      body: JSON.stringify({ reason: 'Poor quality' }),
    });
    
    const response = await PUT(request, { params: { id: 'listing-123' } });

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Database connection failed');
  });
});
