/**
 * Mobile Scan Page
 * 
 * This page is accessed via QR code from desktop.
 * It provides a mobile-optimized camera interface for capturing book images.
 * 
 * Requirements:
 * - 2.1: Handle QR code scanning from mobile
 * - 2.2: Mobile users get direct camera access
 */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import EnhancedAIScanner from '@/components/ai-scanner/EnhancedAIScanner';

function MobileScanContent() {
  const searchParams = useSearchParams();
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Invalid Scan Link</h1>
          <p className="text-gray-600">
            This scan link is invalid or has expired. Please scan the QR code again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4">
        <EnhancedAIScanner
          onComplete={(result, imageUrls) => {
            // Show success message
            console.log('Scan complete:', result, imageUrls);
          }}
        />
      </div>
    </div>
  );
}

export default function MobileScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scanner...</p>
        </div>
      </div>
    }>
      <MobileScanContent />
    </Suspense>
  );
}
