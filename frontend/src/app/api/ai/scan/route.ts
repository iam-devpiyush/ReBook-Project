/**
 * AI Scanner API Route
 * 
 * Handles AI-powered book scanning with ISBN detection, metadata fetching,
 * and condition analysis. Publishes real-time progress updates via Supabase Realtime.
 * 
 * Requirements:
 * - 2.5-2.11: AI scanning with ISBN detection, metadata fetching, and condition analysis
 * - 8.6: Publish real-time progress updates via Supabase Realtime
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/middleware';
import { detectISBNBarcode } from '@/lib/ai-scanner/isbn-detection';
import { fetchBookMetadata, type BookMetadata } from '@/lib/ai-scanner/metadata-fetcher';
import { analyzeBookCondition, type ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';

// ============================================================================
// Type Definitions
// ============================================================================

interface ScanRequest {
  images: {
    front_cover: string;
    back_cover: string;
    spine: string;
    pages: string;
  };
  scan_id: string;
}

interface ScanResult {
  scan_id: string;
  detected_isbn: string | null;
  book_metadata: BookMetadata | null;
  condition_analysis: ConditionAnalysis;
  status: 'completed' | 'failed';
  error?: string;
}

// ============================================================================
// Progress Publishing Functions
// ============================================================================

/**
 * Publish progress update via Supabase Realtime
 * 
 * Requirement 8.6: Publish real-time progress updates
 * 
 * @param supabase - Supabase client
 * @param scanId - Scan ID for tracking
 * @param progress - Progress percentage (0-100)
 * @param message - Progress message
 */
async function publishProgress(
  supabase: ReturnType<typeof createServerClient>,
  scanId: string,
  progress: number,
  message: string
): Promise<void> {
  try {
    // Insert progress update into ai_scans table
    // Supabase Realtime will broadcast this to subscribed clients
    await supabase
      .from('ai_scans')
      .upsert({
        id: scanId,
        progress_percentage: progress,
        scan_status: progress === 100 ? 'completed' : 'in_progress',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    console.log(`Progress: ${progress}% - ${message}`);
  } catch (error) {
    console.error('Failed to publish progress:', error);
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

/**
 * POST /api/ai/scan
 * 
 * Perform AI-powered book scanning with real-time progress updates
 * 
 * Requirements:
 * - 2.5: Detect ISBN from cover images
 * - 2.6: Extract ISBN-10 or ISBN-13
 * - 2.7: Fetch book metadata from external API
 * - 2.8-2.10: Analyze book condition
 * - 2.11: Publish real-time progress updates
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { user } = authResult;
    
    // Parse request body
    const body: ScanRequest = await request.json();
    
    // Validate request
    if (!body.images || !body.scan_id) {
      return NextResponse.json(
        { error: 'images and scan_id are required' },
        { status: 400 }
      );
    }
    
    const { images, scan_id } = body;
    
    // Validate all required images are present
    if (!images.front_cover || !images.back_cover || !images.spine || !images.pages) {
      return NextResponse.json(
        { error: 'All image types are required: front_cover, back_cover, spine, pages' },
        { status: 400 }
      );
    }
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Initialize scan result
    const scanResult: ScanResult = {
      scan_id,
      detected_isbn: null,
      book_metadata: null,
      condition_analysis: {
        cover_damage: 3,
        page_quality: 3,
        binding_quality: 3,
        markings: 3,
        discoloration: 3,
        overall_score: 3,
        confidence: 0,
        notes: ''
      },
      status: 'completed'
    };
    
    try {
      // Create initial AI scan record
      await supabase
        .from('ai_scans')
        .insert({
          id: scan_id,
          images: [images.front_cover, images.back_cover, images.spine, images.pages],
          scan_status: 'in_progress',
          progress_percentage: 0
        });
      
      // Step 1: Publish initial progress (0%)
      await publishProgress(supabase, scan_id, 0, 'Starting scan...');
      
      // Step 2: Detect ISBN from cover images (Requirement 2.5, 2.6)
      console.log('Detecting ISBN...');
      const detectedISBN = await detectISBNBarcode(
        images.front_cover,
        images.back_cover
      );
      
      scanResult.detected_isbn = detectedISBN;
      
      // Step 3: Publish progress (25% - ISBN detected)
      await publishProgress(
        supabase,
        scan_id,
        25,
        detectedISBN ? `ISBN detected: ${detectedISBN}` : 'ISBN not detected'
      );
      
      // Step 4: Fetch book metadata if ISBN found (Requirement 2.7)
      if (detectedISBN) {
        console.log('Fetching book metadata...');
        const metadata = await fetchBookMetadata(detectedISBN);
        scanResult.book_metadata = metadata;
        
        // Step 5: Publish progress (50% - Metadata fetched)
        await publishProgress(
          supabase,
          scan_id,
          50,
          metadata ? 'Metadata fetched' : 'Metadata not found'
        );
      } else {
        // Skip metadata fetching if no ISBN
        await publishProgress(
          supabase,
          scan_id,
          50,
          'Skipping metadata fetch (no ISBN)'
        );
      }
      
      // Step 6: Analyze book condition (Requirement 2.8-2.10)
      console.log('Analyzing book condition...');
      const conditionAnalysis = await analyzeBookCondition(images);
      scanResult.condition_analysis = conditionAnalysis;
      
      // Step 7: Publish progress (90% - Condition analyzed)
      await publishProgress(
        supabase,
        scan_id,
        90,
        `Condition analyzed: Score ${conditionAnalysis.overall_score}/5`
      );
      
      // Step 8: Save complete AI scan record to database
      await supabase
        .from('ai_scans')
        .update({
          detected_isbn: detectedISBN,
          fetched_metadata: scanResult.book_metadata,
          condition_analysis: conditionAnalysis,
          scan_status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .eq('id', scan_id);
      
      // Step 9: Publish final progress (100% - Scan complete)
      await publishProgress(supabase, scan_id, 100, 'Scan complete!');
      
      console.log('AI scan completed successfully');
      
      return NextResponse.json({
        success: true,
        result: scanResult
      });
      
    } catch (scanError) {
      console.error('AI scan error:', scanError);
      
      // Update scan status to failed
      await supabase
        .from('ai_scans')
        .update({
          scan_status: 'failed',
          error_message: scanError instanceof Error ? scanError.message : String(scanError)
        })
        .eq('id', scan_id);
      
      scanResult.status = 'failed';
      scanResult.error = scanError instanceof Error ? scanError.message : String(scanError);
      
      return NextResponse.json({
        success: false,
        result: scanResult,
        error: 'AI scan failed'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
