/**
 * Enhanced AI Scanner Component
 * 
 * Multi-platform AI scanner with QR code for desktop and direct camera access for mobile.
 * Captures book images, uploads to Supabase Storage, and displays real-time progress.
 * 
 * Requirements:
 * - 2.1: Desktop users get QR code for mobile camera access
 * - 2.2: Mobile users get direct camera access
 * - 2.3: Capture front cover, back cover, spine, and pages
 * - 2.11: Real-time progress updates at 0%, 25%, 50%, 75%, 100%
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/hooks';
import { v4 as uuidv4 } from 'uuid';
import QRCodeGenerator from './QRCodeGenerator';
import CameraCapture from './CameraCapture';
import type { BookMetadata } from '@/lib/ai-scanner/metadata-fetcher';
import type { ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';

// ============================================================================
// Type Definitions
// ============================================================================

type Platform = 'desktop' | 'mobile';
type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages';

interface CapturedImage {
  type: ImageType;
  file: File;
  preview: string;
}

interface ScanProgress {
  percentage: number;
  message: string;
}

interface ScanResult {
  detected_isbn: string | null;
  book_metadata: BookMetadata | null;
  condition_analysis: ConditionAnalysis;
}

// ============================================================================
// Component Props
// ============================================================================

interface EnhancedAIScannerProps {
  onComplete?: (result: ScanResult, imageUrls: Record<ImageType, string>) => void;
  onCancel?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function EnhancedAIScanner({
  onComplete,
  onCancel
}: EnhancedAIScannerProps) {
  const { user } = useAuth();
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [scanId] = useState(() => uuidv4());
  const [listingId] = useState(() => uuidv4());
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [currentImageType, setCurrentImageType] = useState<ImageType>('front_cover');
  const [uploadedUrls, setUploadedUrls] = useState<Partial<Record<ImageType, string>>>({});
  const [scanProgress, setScanProgress] = useState<ScanProgress>({ percentage: 0, message: '' });
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  // Image capture sequence
  const imageSequence: ImageType[] = ['front_cover', 'back_cover', 'spine', 'pages'];

  // ============================================================================
  // Platform Detection
  // ============================================================================

  useEffect(() => {
    // Detect platform (Requirement 2.1, 2.2)
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;

      return (isMobile || hasTouch || isSmallScreen) ? 'mobile' : 'desktop';
    };

    setPlatform(detectPlatform());
  }, []);

  // ============================================================================
  // Supabase Realtime Subscription
  // ============================================================================

  useEffect(() => {
    if (!isScanning) return;

    const supabase = createClient();

    // Subscribe to AI scan progress updates (Requirement 2.11)
    const channel = supabase
      .channel(`ai-scan-${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_scans',
          filter: `id=eq.${scanId}`
        },
        (payload: any) => {
          const { progress_percentage, scan_status } = payload.new;
          
          // Update progress
          if (progress_percentage !== undefined) {
            const messages: Record<number, string> = {
              0: 'Starting scan...',
              25: 'ISBN detected',
              50: 'Fetching metadata...',
              75: 'Analyzing condition...',
              100: 'Scan complete!'
            };

            setScanProgress({
              percentage: progress_percentage,
              message: messages[progress_percentage] || `Processing... ${progress_percentage}%`
            });
          }

          // Handle completion
          if (scan_status === 'completed' && progress_percentage === 100) {
            fetchScanResult();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isScanning, scanId]);

  // ============================================================================
  // Image Capture Handlers
  // ============================================================================

  const handleImageCapture = (file: File, preview: string) => {
    const newImage: CapturedImage = {
      type: currentImageType,
      file,
      preview
    };

    setCapturedImages(prev => [...prev, newImage]);

    // Move to next image type
    const currentIndex = imageSequence.indexOf(currentImageType);
    if (currentIndex < imageSequence.length - 1) {
      setCurrentImageType(imageSequence[currentIndex + 1]);
    } else {
      // All images captured, proceed to upload
      setShowCamera(false);
    }
  };

  const handleRetake = (imageType: ImageType) => {
    setCapturedImages(prev => prev.filter(img => img.type !== imageType));
    setCurrentImageType(imageType);
    setShowCamera(true);
  };

  // ============================================================================
  // Image Upload
  // ============================================================================

  const uploadImages = async () => {
    if (!user) {
      setError('User not authenticated');
      return null;
    }

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      formData.append('listingId', listingId);

      capturedImages.forEach(img => {
        formData.append(img.type, img.file);
      });

      // Upload to API route (Requirement 2.4)
      const response = await fetch('/api/listings/images', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Image upload failed');
      }

      const data = await response.json();

      // Extract full-size URLs
      const urls: Record<ImageType, string> = {} as any;
      data.images.forEach((img: any) => {
        urls[img.imageType as ImageType] = img.sizes.full;
      });

      setUploadedUrls(urls);
      return urls;

    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload images');
      return null;
    }
  };

  // ============================================================================
  // AI Scan
  // ============================================================================

  const startAIScan = async () => {
    if (capturedImages.length !== 4) {
      setError('Please capture all 4 images');
      return;
    }

    setIsScanning(true);
    setError(null);
    setScanProgress({ percentage: 0, message: 'Uploading images...' });

    try {
      // Upload images
      const urls = await uploadImages();
      if (!urls) {
        throw new Error('Image upload failed');
      }

      // Start AI scan
      const response = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scan_id: scanId,
          images: urls
        })
      });

      if (!response.ok) {
        throw new Error('AI scan failed');
      }

      // Progress updates will come via Realtime subscription

    } catch (err) {
      console.error('Scan error:', err);
      setError('AI scan failed. Please try again.');
      setIsScanning(false);
    }
  };

  const fetchScanResult = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('ai_scans')
        .select('*')
        .eq('id', scanId)
        .single();

      if (error) throw error;

      const result: ScanResult = {
        detected_isbn: data.detected_isbn,
        book_metadata: data.fetched_metadata,
        condition_analysis: data.condition_analysis
      };

      setScanResult(result);
      setIsScanning(false);

      // Notify parent component
      if (onComplete && uploadedUrls) {
        onComplete(result, uploadedUrls as Record<ImageType, string>);
      }

    } catch (err) {
      console.error('Failed to fetch scan result:', err);
      setError('Failed to retrieve scan results');
      setIsScanning(false);
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const getImageTypeLabel = (type: ImageType): string => {
    const labels: Record<ImageType, string> = {
      front_cover: 'Front Cover',
      back_cover: 'Back Cover',
      spine: 'Spine',
      pages: 'Pages'
    };
    return labels[type];
  };

  const allImagesCaptured = capturedImages.length === 4;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6">AI Book Scanner</h2>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Desktop QR Code (Requirement 2.1) */}
        {platform === 'desktop' && !showCamera && !isScanning && !scanResult && (
          <div className="mb-6">
            <QRCodeGenerator
              scanId={scanId}
              onMobileConnected={() => setShowCamera(true)}
            />
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowCamera(true)}
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Or use desktop camera
              </button>
            </div>
          </div>
        )}

        {/* Mobile Direct Camera (Requirement 2.2) */}
        {platform === 'mobile' && !showCamera && !isScanning && !scanResult && (
          <div className="mb-6 text-center">
            <p className="mb-4 text-gray-600">
              Capture 4 images of your book: front cover, back cover, spine, and pages
            </p>
            <button
              onClick={() => setShowCamera(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Camera
            </button>
          </div>
        )}

        {/* Camera Capture (Requirement 2.3) */}
        {showCamera && !isScanning && !scanResult && (
          <CameraCapture
            imageType={currentImageType}
            onCapture={handleImageCapture}
            onCancel={() => setShowCamera(false)}
          />
        )}

        {/* Captured Images Preview */}
        {!showCamera && capturedImages.length > 0 && !isScanning && !scanResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Captured Images</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {imageSequence.map(type => {
                const image = capturedImages.find(img => img.type === type);
                return (
                  <div key={type} className="border rounded-lg p-2">
                    <div className="text-sm font-medium mb-2">{getImageTypeLabel(type)}</div>
                    {image ? (
                      <>
                        <img
                          src={image.preview}
                          alt={getImageTypeLabel(type)}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                        <button
                          onClick={() => handleRetake(type)}
                          className="w-full text-sm text-blue-600 hover:text-blue-700"
                        >
                          Retake
                        </button>
                      </>
                    ) : (
                      <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        Not captured
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={startAIScan}
                disabled={!allImagesCaptured}
                className={`flex-1 px-6 py-3 rounded-lg font-medium ${
                  allImagesCaptured
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Start AI Scan
              </button>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar (Requirement 2.11) */}
        {isScanning && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Scanning in Progress</h3>
            <div className="mb-2">
              <div className="flex justify-between text-sm mb-1">
                <span>{scanProgress.message}</span>
                <span>{scanProgress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${scanProgress.percentage}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-4">
              Please wait while we analyze your book...
            </p>
          </div>
        )}

        {/* Scan Results */}
        {scanResult && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Scan Complete!</h3>
            
            {/* ISBN Detection */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium mb-2">ISBN Detection</div>
              {scanResult.detected_isbn ? (
                <div className="text-green-600">✓ ISBN: {scanResult.detected_isbn}</div>
              ) : (
                <div className="text-yellow-600">⚠ ISBN not detected</div>
              )}
            </div>

            {/* Book Metadata */}
            {scanResult.book_metadata && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="font-medium mb-2">Book Information</div>
                <div className="space-y-1 text-sm">
                  <div><span className="font-medium">Title:</span> {scanResult.book_metadata.title}</div>
                  <div><span className="font-medium">Author:</span> {scanResult.book_metadata.author}</div>
                  {scanResult.book_metadata.publisher && (
                    <div><span className="font-medium">Publisher:</span> {scanResult.book_metadata.publisher}</div>
                  )}
                  {scanResult.book_metadata.publication_year && (
                    <div><span className="font-medium">Year:</span> {scanResult.book_metadata.publication_year}</div>
                  )}
                </div>
              </div>
            )}

            {/* Condition Analysis */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="font-medium mb-2">Condition Analysis</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Overall Score:</span>
                  <span className="font-bold">{scanResult.condition_analysis.overall_score}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Cover Damage:</span>
                  <span>{scanResult.condition_analysis.cover_damage}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Page Quality:</span>
                  <span>{scanResult.condition_analysis.page_quality}/5</span>
                </div>
                <div className="flex justify-between">
                  <span>Binding Quality:</span>
                  <span>{scanResult.condition_analysis.binding_quality}/5</span>
                </div>
                {scanResult.condition_analysis.notes && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-gray-600">{scanResult.condition_analysis.notes}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
