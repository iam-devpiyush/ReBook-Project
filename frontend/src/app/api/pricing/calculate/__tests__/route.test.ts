/**
 * Integration tests for POST /api/pricing/calculate
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

vi.mock('@/lib/pricing/pricing-engine', () => ({
  calculateEnhancedPricing: vi.fn().mockResolvedValue({
    original_price: 500,
    condition_score: 4,
    base_price: 400,
    delivery_cost: 80,
    platform_commission: 40,
    payment_fees: 12,
    final_price: 532,
    seller_payout: 360,
  }),
}));

import { calculateEnhancedPricing } from '@/lib/pricing/pricing-engine';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/pricing/calculate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

const validBody = {
  original_price: 500,
  condition_score: 4,
  seller_location: { pincode: '400001', city: 'Mumbai', state: 'Maharashtra' },
  buyer_location: { pincode: '110001', city: 'Delhi', state: 'Delhi' },
};

describe('POST /api/pricing/calculate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when original_price is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, original_price: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('price');
  });

  it('returns 400 when original_price is zero', async () => {
    const res = await POST(makeRequest({ ...validBody, original_price: 0 }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when condition_score is out of range', async () => {
    const res = await POST(makeRequest({ ...validBody, condition_score: 6 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Condition');
  });

  it('returns 400 when seller_location is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, seller_location: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Seller');
  });

  it('returns 400 when buyer_location is missing', async () => {
    const res = await POST(makeRequest({ ...validBody, buyer_location: undefined }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Buyer');
  });

  it('returns 200 with pricing breakdown on valid input', async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.final_price).toBeDefined();
    expect(body.data.seller_payout).toBeDefined();
    expect(body.data.delivery_cost).toBeDefined();
  });

  it('calls calculateEnhancedPricing with correct arguments', async () => {
    await POST(makeRequest(validBody));
    expect(calculateEnhancedPricing).toHaveBeenCalledWith(
      500, 4,
      validBody.seller_location,
      validBody.buyer_location,
      undefined
    );
  });
});
