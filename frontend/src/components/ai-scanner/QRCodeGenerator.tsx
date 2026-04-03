/**
 * QR Code Generator Component
 * 
 * Generates QR code with mobile camera URL for desktop users.
 * 
 * Requirements:
 * - 2.1: Generate QR code with mobile camera URL
 */

'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';

// ============================================================================
// Component Props
// ============================================================================

interface QRCodeGeneratorProps {
  scanId: string;
  onMobileConnected?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function QRCodeGenerator({
  scanId,
  onMobileConnected: _onMobileConnected
}: QRCodeGeneratorProps) {
  const [mobileUrl, setMobileUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Generate mobile camera URL
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/scan/mobile?scanId=${scanId}`;
    setMobileUrl(url);
  }, [scanId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(mobileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">Scan with Mobile Camera</h3>
        <p className="text-gray-600 text-sm">
          Scan this QR code with your mobile device to use your phone's camera
        </p>
      </div>

      {/* QR Code */}
      <div className="bg-white p-6 rounded-lg border-2 border-gray-200 mb-4">
        {mobileUrl && (
          <QRCode
            value={mobileUrl}
            size={256}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
          />
        )}
      </div>

      {/* Mobile URL */}
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={mobileUrl}
            readOnly
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-900"
          />
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center">
          Or manually enter this URL on your mobile device
        </p>
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg max-w-md">
        <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Open your phone's camera app</li>
          <li>Point it at the QR code above</li>
          <li>Tap the notification to open the link</li>
          <li>Follow the on-screen instructions to capture images</li>
        </ol>
      </div>
    </div>
  );
}
