/**
 * Property-Based Test: Condition Score Validity
 * 
 * **Validates: Requirements 2.10**
 * 
 * This test verifies that the condition analysis algorithm always produces
 * valid scores within the expected range (1-5) for all component scores
 * and the overall score.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { analyzeBookCondition, validateConditionAnalysis } from '../condition-analyzer';

describe('Property Test: Condition Score Validity', () => {
  /**
   * Property: All condition scores must be integers between 1 and 5 (inclusive)
   * 
   * **Validates: Requirements 2.10**
   * 
   * For any valid set of book images, the condition analysis must return:
   * - cover_damage: 1-5
   * - page_quality: 1-5
   * - binding_quality: 1-5
   * - markings: 1-5
   * - discoloration: 1-5
   * - overall_score: 1-5
   */
  it('should always return valid condition scores (1-5) for any book images', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary image URLs
        fc.record({
          front_cover: fc.webUrl(),
          back_cover: fc.webUrl(),
          spine: fc.webUrl(),
          pages: fc.webUrl()
        }),
        async (images) => {
          // Analyze book condition
          const analysis = await analyzeBookCondition(images);
          
          // Property 1: All component scores must be between 1 and 5
          expect(analysis.cover_damage).toBeGreaterThanOrEqual(1);
          expect(analysis.cover_damage).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.cover_damage)).toBe(true);
          
          expect(analysis.page_quality).toBeGreaterThanOrEqual(1);
          expect(analysis.page_quality).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.page_quality)).toBe(true);
          
          expect(analysis.binding_quality).toBeGreaterThanOrEqual(1);
          expect(analysis.binding_quality).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.binding_quality)).toBe(true);
          
          expect(analysis.markings).toBeGreaterThanOrEqual(1);
          expect(analysis.markings).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.markings)).toBe(true);
          
          expect(analysis.discoloration).toBeGreaterThanOrEqual(1);
          expect(analysis.discoloration).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.discoloration)).toBe(true);
          
          // Property 2: Overall score must be between 1 and 5
          expect(analysis.overall_score).toBeGreaterThanOrEqual(1);
          expect(analysis.overall_score).toBeLessThanOrEqual(5);
          expect(Number.isInteger(analysis.overall_score)).toBe(true);
          
          // Property 3: Confidence must be between 0 and 1
          expect(analysis.confidence).toBeGreaterThanOrEqual(0);
          expect(analysis.confidence).toBeLessThanOrEqual(1);
          
          // Property 4: Notes must be a non-empty string
          expect(typeof analysis.notes).toBe('string');
          expect(analysis.notes.length).toBeGreaterThan(0);
          
          // Property 5: Validation function must return true
          expect(validateConditionAnalysis(analysis)).toBe(true);
        }
      ),
      {
        numRuns: 100, // Run 100 test cases
        timeout: 30000 // 30 second timeout for async operations
      }
    );
  });
  
  /**
   * Property: Overall score should be within the range of component scores
   * 
   * **Validates: Requirements 2.10**
   * 
   * The overall score (weighted average) should never be less than the minimum
   * component score or greater than the maximum component score.
   */
  it('should calculate overall score within component score range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          front_cover: fc.webUrl(),
          back_cover: fc.webUrl(),
          spine: fc.webUrl(),
          pages: fc.webUrl()
        }),
        async (images) => {
          const analysis = await analyzeBookCondition(images);
          
          const componentScores = [
            analysis.cover_damage,
            analysis.page_quality,
            analysis.binding_quality,
            analysis.markings,
            analysis.discoloration
          ];
          
          const minScore = Math.min(...componentScores);
          const maxScore = Math.max(...componentScores);
          
          // Overall score should be within the range of component scores
          expect(analysis.overall_score).toBeGreaterThanOrEqual(minScore);
          expect(analysis.overall_score).toBeLessThanOrEqual(maxScore);
        }
      ),
      {
        numRuns: 100,
        timeout: 30000
      }
    );
  });
  
  /**
   * Property: Condition analysis should be deterministic for the same inputs
   * 
   * **Validates: Requirements 2.10**
   * 
   * Running the analysis multiple times on the same images should produce
   * the same results (deterministic behavior).
   */
  it('should produce consistent results for the same images', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          front_cover: fc.webUrl(),
          back_cover: fc.webUrl(),
          spine: fc.webUrl(),
          pages: fc.webUrl()
        }),
        async (images) => {
          // Run analysis twice
          const analysis1 = await analyzeBookCondition(images);
          const analysis2 = await analyzeBookCondition(images);
          
          // Results should be identical
          expect(analysis1.cover_damage).toBe(analysis2.cover_damage);
          expect(analysis1.page_quality).toBe(analysis2.page_quality);
          expect(analysis1.binding_quality).toBe(analysis2.binding_quality);
          expect(analysis1.markings).toBe(analysis2.markings);
          expect(analysis1.discoloration).toBe(analysis2.discoloration);
          expect(analysis1.overall_score).toBe(analysis2.overall_score);
        }
      ),
      {
        numRuns: 50, // Fewer runs since we're doing double analysis
        timeout: 60000 // Longer timeout for double analysis
      }
    );
  });
});
