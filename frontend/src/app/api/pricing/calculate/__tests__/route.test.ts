/**
 * Unit Tests for /api/pricing/calculate API Route
 */

import { describe, it, expect } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';

describe('/api/pricing/calculate', () => {
  it('should calculate pricing breakdown successfully', async () => {
    const requestBody = {
      original_price: 500,
      condition_score: 4,
      seller_location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      buyer_location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.original_price).toBe(500);
    expect(data.data.condition_score).toBe(4);
    expect(data.data.base_price).toBe(350); // 500 * 0.70
    expect(data.data.platform_commission).toBe(35); // 350 * 0.10
    expect(data.data.payment_fees).toBeCloseTo(11.75, 2); // (350 * 0.025) + 3.00
    expect(data.data.seller_payout).toBe(315); // 350 - 35
    expect(data.data.delivery_cost).toBeGreaterThan(0);
    expect(data.data.final_price).toBeGreaterThan(0);
    expect(Number.isInteger(data.data.final_price)).toBe(true);
  });

  it('should return 400 for invalid original price', async () => {
    const requestBody = {
      original_price: -100,
      condition_score: 4,
      seller_location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      buyer_location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 400 for invalid condition score', async () => {
    const requestBody = {
      original_price: 500,
      condition_score: 6,
      seller_location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      buyer_location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 400 for missing seller location', async () => {
    const requestBody = {
      original_price: 500,
      condition_score: 4,
      buyer_location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 400 for missing buyer location', async () => {
    const requestBody = {
      original_price: 500,
      condition_score: 4,
      seller_location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should handle custom weight parameter', async () => {
    const requestBody = {
      original_price: 500,
      condition_score: 4,
      seller_location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      buyer_location: {
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
      },
      weight: 1.5,
    };

    const request = new NextRequest('http://localhost:3001/api/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });
});
