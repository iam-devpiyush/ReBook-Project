/**
 * Book Condition Analysis Service
 *
 * Analyzes book condition from images using heuristic scoring.
 * Scores are 1-5 where 5 = best condition, 1 = worst.
 */

export interface ConditionAnalysis {
  cover_damage: number;
  page_quality: number;
  binding_quality: number;
  markings: number;
  discoloration: number;
  overall_score: number;
  confidence: number;
  notes: string;
}

export interface BookImages {
  front_cover: string;
  back_cover: string;
  spine: string;
  pages: string;
}

const WEIGHTS = {
  cover_damage: 0.25,
  page_quality: 0.30,
  binding_quality: 0.20,
  markings: 0.15,
  discoloration: 0.10,
};

/**
 * Analyze image brightness and color variance from a URL.
 * Works with both https:// URLs and data: URLs.
 * Returns metrics used to estimate condition scores.
 */
async function analyzeImageMetrics(imageUrl: string): Promise<{
  brightness: number;   // 0-255 average pixel brightness
  variance: number;     // color variance (higher = more varied/damaged)
  yellowness: number;   // 0-1 ratio of yellowish pixels (discoloration)
}> {
  try {
    // Fetch image as buffer
    let buffer: Buffer;

    if (imageUrl.startsWith('data:')) {
      // data URL — decode base64
      const base64 = imageUrl.split(',')[1];
      buffer = Buffer.from(base64, 'base64');
    } else {
      // Remote URL — fetch it
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
      buffer = Buffer.from(await res.arrayBuffer());
    }

    // Use sharp for pixel analysis
    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: 'cover' }) // Downsample for speed
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels = info.width * info.height;
    let totalBrightness = 0;
    let yellowPixels = 0;
    let brightnessValues: number[] = [];

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;
      brightnessValues.push(brightness);

      // Yellow = high R, high G, low B
      if (r > 180 && g > 160 && b < 120) yellowPixels++;
    }

    const avgBrightness = totalBrightness / pixels;
    const mean = avgBrightness;
    const variance = brightnessValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pixels;
    const yellowness = yellowPixels / pixels;

    return { brightness: avgBrightness, variance, yellowness };
  } catch {
    // Return neutral defaults on failure
    return { brightness: 180, variance: 1000, yellowness: 0.05 };
  }
}

/**
 * Convert image metrics to a 1-5 condition score.
 */
function metricsToScore(metrics: { brightness: number; variance: number; yellowness: number }, type: 'cover' | 'pages' | 'spine'): number {
  let score = 4; // Start optimistic

  if (type === 'cover') {
    // Very dark or very bright covers may indicate damage
    if (metrics.brightness < 80 || metrics.brightness > 240) score -= 1;
    // High variance = lots of scratches/marks
    if (metrics.variance > 3000) score -= 1;
    if (metrics.variance > 5000) score -= 1;
  }

  if (type === 'pages') {
    // Yellow pages = discoloration/age
    if (metrics.yellowness > 0.15) score -= 1;
    if (metrics.yellowness > 0.30) score -= 1;
    // Very dark pages = heavy markings or damage
    if (metrics.brightness < 150) score -= 1;
  }

  if (type === 'spine') {
    // High variance on spine = creases/damage
    if (metrics.variance > 2500) score -= 1;
    if (metrics.variance > 4000) score -= 1;
  }

  return Math.max(1, Math.min(5, score));
}

function calculateOverallScore(components: Omit<ConditionAnalysis, 'overall_score' | 'confidence' | 'notes'>): number {
  const weighted =
    components.cover_damage * WEIGHTS.cover_damage +
    components.page_quality * WEIGHTS.page_quality +
    components.binding_quality * WEIGHTS.binding_quality +
    components.markings * WEIGHTS.markings +
    components.discoloration * WEIGHTS.discoloration;
  return Math.max(1, Math.min(5, Math.round(weighted)));
}

function generateNotes(components: Omit<ConditionAnalysis, 'overall_score' | 'confidence' | 'notes'>): string {
  const notes: string[] = [];
  if (components.cover_damage >= 4) notes.push('Cover in good condition');
  else if (components.cover_damage <= 2) notes.push('Cover shows significant wear');
  if (components.page_quality >= 4) notes.push('Pages clean and crisp');
  else if (components.page_quality <= 2) notes.push('Pages show wear or damage');
  if (components.binding_quality <= 2) notes.push('Binding may be loose');
  if (components.markings <= 2) notes.push('Contains markings or highlights');
  if (components.discoloration <= 2) notes.push('Shows discoloration or yellowing');
  return notes.length > 0 ? notes.join('. ') + '.' : 'Book is in acceptable condition.';
}

export async function analyzeBookCondition(images: BookImages): Promise<ConditionAnalysis> {
  try {
    const [frontMetrics, backMetrics, spineMetrics, pagesMetrics] = await Promise.all([
      analyzeImageMetrics(images.front_cover),
      analyzeImageMetrics(images.back_cover),
      analyzeImageMetrics(images.spine),
      analyzeImageMetrics(images.pages),
    ]);

    const cover_damage = Math.round(
      (metricsToScore(frontMetrics, 'cover') + metricsToScore(backMetrics, 'cover')) / 2
    );
    const page_quality = metricsToScore(pagesMetrics, 'pages');
    const binding_quality = metricsToScore(spineMetrics, 'spine');

    // Markings: dark spots on pages suggest writing/highlighting
    const markings = pagesMetrics.variance > 4000 ? 2 : pagesMetrics.variance > 2000 ? 3 : 4;

    // Discoloration: based on yellowness of pages
    const discoloration = pagesMetrics.yellowness > 0.3 ? 2
      : pagesMetrics.yellowness > 0.15 ? 3
        : pagesMetrics.yellowness > 0.05 ? 4
          : 5;

    const components = {
      cover_damage: Math.max(1, Math.min(5, cover_damage)),
      page_quality: Math.max(1, Math.min(5, page_quality)),
      binding_quality: Math.max(1, Math.min(5, binding_quality)),
      markings: Math.max(1, Math.min(5, markings)),
      discoloration: Math.max(1, Math.min(5, discoloration)),
    };

    return {
      ...components,
      overall_score: calculateOverallScore(components),
      confidence: 0.7,
      notes: generateNotes(components),
    };

  } catch (error) {
    console.error('Condition analysis error:', error);
    return {
      cover_damage: 3, page_quality: 3, binding_quality: 3,
      markings: 3, discoloration: 3, overall_score: 3,
      confidence: 0.3,
      notes: 'Condition estimated as average.',
    };
  }
}

export function validateConditionAnalysis(analysis: ConditionAnalysis): boolean {
  return [
    analysis.cover_damage, analysis.page_quality, analysis.binding_quality,
    analysis.markings, analysis.discoloration, analysis.overall_score
  ].every(s => s >= 1 && s <= 5);
}
