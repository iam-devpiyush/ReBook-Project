/**
 * Book Condition Analysis Service
 * 
 * Analyzes book condition from images and assigns component scores.
 * 
 * Requirements:
 * - 2.8: Analyze cover damage, page quality, binding quality, markings, discoloration
 * - 2.9: Assign component scores (1-5) for each factor
 * - 2.10: Calculate weighted average for overall condition score
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ConditionAnalysis {
  cover_damage: number; // 1-5 (5 = no damage, 1 = severe damage)
  page_quality: number; // 1-5 (5 = pristine, 1 = poor)
  binding_quality: number; // 1-5 (5 = tight, 1 = loose/broken)
  markings: number; // 1-5 (5 = no markings, 1 = heavy markings)
  discoloration: number; // 1-5 (5 = no discoloration, 1 = severe)
  overall_score: number; // 1-5 (weighted average)
  confidence: number; // 0-1 (confidence in analysis)
  notes: string;
}

export interface BookImages {
  front_cover: string;
  back_cover: string;
  spine: string;
  pages: string;
}

// ============================================================================
// Condition Analysis Weights
// ============================================================================

/**
 * Weights for calculating overall condition score
 * 
 * These weights determine the importance of each factor in the final score.
 */
const CONDITION_WEIGHTS = {
  cover_damage: 0.25,      // 25% - Cover is highly visible
  page_quality: 0.30,      // 30% - Pages are most important for usability
  binding_quality: 0.20,   // 20% - Binding affects durability
  markings: 0.15,          // 15% - Markings affect readability
  discoloration: 0.10      // 10% - Discoloration is less critical
} as const;

// ============================================================================
// Heuristic Analysis Functions
// ============================================================================

/**
 * Analyze cover damage from front and back cover images
 * 
 * This is a simplified heuristic-based analysis.
 * In production, this could use ML models for image analysis.
 * 
 * @param frontCoverUrl - Front cover image URL
 * @param backCoverUrl - Back cover image URL
 * @returns Cover damage score (1-5)
 */
async function analyzeCoverDamage(
  frontCoverUrl: string,
  backCoverUrl: string
): Promise<number> {
  // Simplified heuristic: Default to "Good" condition (3)
  // In production, this would use image analysis to detect:
  // - Tears, creases, scratches
  // - Corner damage
  // - Spine damage
  // - Cover wear
  
  // For now, return a default score
  // TODO: Implement actual image analysis
  return 3;
}

/**
 * Analyze page quality from pages image
 * 
 * @param pagesUrl - Pages image URL
 * @returns Page quality score (1-5)
 */
async function analyzePageQuality(pagesUrl: string): Promise<number> {
  // Simplified heuristic: Default to "Good" condition (3)
  // In production, this would analyze:
  // - Page yellowing
  // - Tears or missing pages
  // - Water damage
  // - Page cleanliness
  
  // For now, return a default score
  // TODO: Implement actual image analysis
  return 3;
}

/**
 * Analyze binding quality from spine image
 * 
 * @param spineUrl - Spine image URL
 * @returns Binding quality score (1-5)
 */
async function analyzeBindingQuality(spineUrl: string): Promise<number> {
  // Simplified heuristic: Default to "Good" condition (3)
  // In production, this would analyze:
  // - Spine integrity
  // - Binding tightness
  // - Loose pages
  // - Broken spine
  
  // For now, return a default score
  // TODO: Implement actual image analysis
  return 3;
}

/**
 * Analyze markings from pages image
 * 
 * @param pagesUrl - Pages image URL
 * @returns Markings score (1-5)
 */
async function analyzeMarkings(pagesUrl: string): Promise<number> {
  // Simplified heuristic: Default to "Good" condition (3)
  // In production, this would detect:
  // - Highlighting
  // - Underlining
  // - Handwritten notes
  // - Stamps or stickers
  
  // For now, return a default score
  // TODO: Implement actual image analysis
  return 3;
}

/**
 * Analyze discoloration from all images
 * 
 * @param images - All book images
 * @returns Discoloration score (1-5)
 */
async function analyzeDiscoloration(images: BookImages): Promise<number> {
  // Simplified heuristic: Default to "Good" condition (3)
  // In production, this would analyze:
  // - Page yellowing
  // - Cover fading
  // - Stains or spots
  // - Overall color degradation
  
  // For now, return a default score
  // TODO: Implement actual image analysis
  return 3;
}

// ============================================================================
// Overall Condition Calculation
// ============================================================================

/**
 * Calculate overall condition score from component scores
 * 
 * Uses weighted average based on CONDITION_WEIGHTS.
 * 
 * Requirement 2.10: Calculate weighted average for overall condition score
 * 
 * @param components - Component scores
 * @returns Overall condition score (1-5)
 */
function calculateOverallScore(components: {
  cover_damage: number;
  page_quality: number;
  binding_quality: number;
  markings: number;
  discoloration: number;
}): number {
  const weightedSum = 
    components.cover_damage * CONDITION_WEIGHTS.cover_damage +
    components.page_quality * CONDITION_WEIGHTS.page_quality +
    components.binding_quality * CONDITION_WEIGHTS.binding_quality +
    components.markings * CONDITION_WEIGHTS.markings +
    components.discoloration * CONDITION_WEIGHTS.discoloration;
  
  // Round to nearest integer (1-5)
  return Math.round(weightedSum);
}

/**
 * Generate condition notes based on scores
 * 
 * @param components - Component scores
 * @returns Human-readable condition notes
 */
function generateConditionNotes(components: {
  cover_damage: number;
  page_quality: number;
  binding_quality: number;
  markings: number;
  discoloration: number;
}): string {
  const notes: string[] = [];
  
  // Cover damage
  if (components.cover_damage >= 4) {
    notes.push('Cover is in excellent condition');
  } else if (components.cover_damage <= 2) {
    notes.push('Cover shows significant wear');
  }
  
  // Page quality
  if (components.page_quality >= 4) {
    notes.push('Pages are clean and crisp');
  } else if (components.page_quality <= 2) {
    notes.push('Pages show signs of wear or damage');
  }
  
  // Binding quality
  if (components.binding_quality >= 4) {
    notes.push('Binding is tight and secure');
  } else if (components.binding_quality <= 2) {
    notes.push('Binding may be loose or damaged');
  }
  
  // Markings
  if (components.markings >= 4) {
    notes.push('No visible markings or highlights');
  } else if (components.markings <= 2) {
    notes.push('Contains markings, highlights, or notes');
  }
  
  // Discoloration
  if (components.discoloration >= 4) {
    notes.push('No discoloration or yellowing');
  } else if (components.discoloration <= 2) {
    notes.push('Shows discoloration or yellowing');
  }
  
  return notes.length > 0 ? notes.join('. ') + '.' : 'Book is in acceptable condition.';
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze book condition from images
 * 
 * Requirements:
 * - 2.8: Analyze cover damage, page quality, binding quality, markings, discoloration
 * - 2.9: Assign component scores (1-5) for each factor
 * - 2.10: Calculate weighted average for overall condition score
 * 
 * @param images - Book images (front_cover, back_cover, spine, pages)
 * @returns Condition analysis with component scores and overall score
 */
export async function analyzeBookCondition(images: BookImages): Promise<ConditionAnalysis> {
  try {
    console.log('Starting condition analysis...');
    
    // Analyze each component
    const [
      coverDamage,
      pageQuality,
      bindingQuality,
      markings,
      discoloration
    ] = await Promise.all([
      analyzeCoverDamage(images.front_cover, images.back_cover),
      analyzePageQuality(images.pages),
      analyzeBindingQuality(images.spine),
      analyzeMarkings(images.pages),
      analyzeDiscoloration(images)
    ]);
    
    // Ensure all scores are within valid range (1-5)
    const components = {
      cover_damage: Math.max(1, Math.min(5, coverDamage)),
      page_quality: Math.max(1, Math.min(5, pageQuality)),
      binding_quality: Math.max(1, Math.min(5, bindingQuality)),
      markings: Math.max(1, Math.min(5, markings)),
      discoloration: Math.max(1, Math.min(5, discoloration))
    };
    
    // Calculate overall score
    const overallScore = calculateOverallScore(components);
    
    // Generate notes
    const notes = generateConditionNotes(components);
    
    console.log('Condition analysis complete:', { overallScore, components });
    
    return {
      ...components,
      overall_score: overallScore,
      confidence: 0.75, // Default confidence for heuristic analysis
      notes
    };
    
  } catch (error) {
    console.error('Condition analysis error:', error);
    
    // Return default "Good" condition on error
    return {
      cover_damage: 3,
      page_quality: 3,
      binding_quality: 3,
      markings: 3,
      discoloration: 3,
      overall_score: 3,
      confidence: 0.5,
      notes: 'Condition analysis failed. Default condition assigned.'
    };
  }
}

/**
 * Validate condition analysis result
 * 
 * @param analysis - Condition analysis to validate
 * @returns True if all scores are valid (1-5)
 */
export function validateConditionAnalysis(analysis: ConditionAnalysis): boolean {
  const scores = [
    analysis.cover_damage,
    analysis.page_quality,
    analysis.binding_quality,
    analysis.markings,
    analysis.discoloration,
    analysis.overall_score
  ];
  
  return scores.every(score => score >= 1 && score <= 5);
}
