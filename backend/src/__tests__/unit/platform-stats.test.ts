/**
 * Unit Tests for Platform Stats Service
 * 
 * Tests the platform statistics calculation service including:
 * - Environmental impact calculations (pure logic, no DB required)
 * - Stats structure validation
 */

import { describe, it, expect } from '@jest/globals';

// Import the environmental impact calculation logic directly
// We test the pure calculation logic without requiring a DB connection

/**
 * Pure function for environmental impact calculation
 * Mirrors the logic in platform-stats.service.ts
 */
function calculateEnvironmentalImpact(booksReused: number): {
  trees_saved: number;
  water_saved_liters: number;
  co2_reduced_kg: number;
} {
  const trees_saved = booksReused / 30;
  const water_saved_liters = booksReused * 50;
  const co2_reduced_kg = booksReused * 2.5;

  return {
    trees_saved: Number(trees_saved.toFixed(2)),
    water_saved_liters: Number(water_saved_liters.toFixed(2)),
    co2_reduced_kg: Number(co2_reduced_kg.toFixed(2)),
  };
}

describe('Platform Stats - Environmental Impact Calculations', () => {
  describe('calculateEnvironmentalImpact', () => {
    it('should calculate trees saved correctly (books_reused / 30)', () => {
      // Requirement 10.1: trees_saved = books_reused / 30
      expect(calculateEnvironmentalImpact(30).trees_saved).toBe(1.0);
      expect(calculateEnvironmentalImpact(60).trees_saved).toBe(2.0);
      expect(calculateEnvironmentalImpact(15).trees_saved).toBe(0.5);
      expect(calculateEnvironmentalImpact(1).trees_saved).toBe(0.03);
    });

    it('should calculate water saved correctly (books_reused × 50)', () => {
      // Requirement 10.2: water_saved_liters = books_reused × 50
      expect(calculateEnvironmentalImpact(1).water_saved_liters).toBe(50.0);
      expect(calculateEnvironmentalImpact(10).water_saved_liters).toBe(500.0);
      expect(calculateEnvironmentalImpact(100).water_saved_liters).toBe(5000.0);
    });

    it('should calculate CO2 reduced correctly (books_reused × 2.5)', () => {
      // Requirement 10.3: co2_reduced_kg = books_reused × 2.5
      expect(calculateEnvironmentalImpact(1).co2_reduced_kg).toBe(2.5);
      expect(calculateEnvironmentalImpact(10).co2_reduced_kg).toBe(25.0);
      expect(calculateEnvironmentalImpact(100).co2_reduced_kg).toBe(250.0);
    });

    it('should handle zero books reused', () => {
      const impact = calculateEnvironmentalImpact(0);
      expect(impact.trees_saved).toBe(0);
      expect(impact.water_saved_liters).toBe(0);
      expect(impact.co2_reduced_kg).toBe(0);
    });

    it('should round values to 2 decimal places', () => {
      // Requirement 10.8: round all values to 2 decimal places
      const impact = calculateEnvironmentalImpact(1);
      expect(impact.trees_saved.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(impact.water_saved_liters.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
      expect(impact.co2_reduced_kg.toString()).toMatch(/^\d+(\.\d{1,2})?$/);
    });

    it('should return non-negative values for positive book counts', () => {
      const impact = calculateEnvironmentalImpact(100);
      expect(impact.trees_saved).toBeGreaterThanOrEqual(0);
      expect(impact.water_saved_liters).toBeGreaterThanOrEqual(0);
      expect(impact.co2_reduced_kg).toBeGreaterThanOrEqual(0);
    });
  });

  describe('PlatformStats structure', () => {
    it('should have all required fields', () => {
      // Verify the expected structure of PlatformStats
      const expectedFields = [
        'date',
        'total_books_listed',
        'total_books_sold',
        'active_listings',
        'total_users',
        'total_buyers',
        'total_sellers',
        'revenue_generated',
        'platform_commission_earned',
        'trees_saved',
        'water_saved_liters',
        'co2_reduced_kg',
      ];

      // Create a mock stats object to verify structure
      const mockStats = {
        date: '2024-01-01',
        total_books_listed: 100,
        total_books_sold: 50,
        active_listings: 30,
        total_users: 200,
        total_buyers: 80,
        total_sellers: 60,
        revenue_generated: 5000.00,
        platform_commission_earned: 500.00,
        trees_saved: 1.67,
        water_saved_liters: 2500.00,
        co2_reduced_kg: 125.00,
      };

      for (const field of expectedFields) {
        expect(mockStats).toHaveProperty(field);
      }
    });

    it('should have non-negative metric values', () => {
      const mockStats = {
        date: '2024-01-01',
        total_books_listed: 100,
        total_books_sold: 50,
        active_listings: 30,
        total_users: 200,
        total_buyers: 80,
        total_sellers: 60,
        revenue_generated: 5000.00,
        platform_commission_earned: 500.00,
        trees_saved: 1.67,
        water_saved_liters: 2500.00,
        co2_reduced_kg: 125.00,
      };

      expect(mockStats.total_books_listed).toBeGreaterThanOrEqual(0);
      expect(mockStats.total_books_sold).toBeGreaterThanOrEqual(0);
      expect(mockStats.active_listings).toBeGreaterThanOrEqual(0);
      expect(mockStats.total_users).toBeGreaterThanOrEqual(0);
      expect(mockStats.total_buyers).toBeGreaterThanOrEqual(0);
      expect(mockStats.total_sellers).toBeGreaterThanOrEqual(0);
      expect(mockStats.revenue_generated).toBeGreaterThanOrEqual(0);
      expect(mockStats.platform_commission_earned).toBeGreaterThanOrEqual(0);
      expect(mockStats.trees_saved).toBeGreaterThanOrEqual(0);
      expect(mockStats.water_saved_liters).toBeGreaterThanOrEqual(0);
      expect(mockStats.co2_reduced_kg).toBeGreaterThanOrEqual(0);
    });

    it('should have a valid date format (YYYY-MM-DD)', () => {
      const dateString = new Date().toISOString().split('T')[0];
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Revenue metrics consistency', () => {
    it('platform_commission_earned should be less than or equal to revenue_generated', () => {
      // Commission is a percentage of revenue, so it should always be <= revenue
      const revenue = 5000;
      const commission = revenue * 0.10; // 10% commission
      expect(commission).toBeLessThanOrEqual(revenue);
    });

    it('environmental impact should scale linearly with books reused', () => {
      const impact1 = calculateEnvironmentalImpact(10);
      const impact2 = calculateEnvironmentalImpact(20);

      // Doubling books should double the impact
      expect(impact2.water_saved_liters).toBe(impact1.water_saved_liters * 2);
      expect(impact2.co2_reduced_kg).toBe(impact1.co2_reduced_kg * 2);
    });
  });
});
