/**
 * Camera Capture Component
 * 
 * Opens device camera, captures images, shows previews, and allows retakes.
 * 
 * Requirements:
 * - 2.2: Open device camera
 * - 2.3: Capture images for each book section
 */

'use client';

import { useState, useRef, useEffect } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages';

// ============================================================================
// Component Props
// ============================================================================

interface CameraCaptureProps {
  imageType: ImageType;
  onCapture: (file: File, preview: string) => void;
  onCancel: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function CameraCapture({
  imageType,
  onCapture,
  onCancel
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // ============================================================================
  // Camera Initialization
  // ============================================================================

  useEffect(() => {
    startCamera();

    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      // Request camera access (Requirement 2.2)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setStream(mediaStream);
      setCameraActive(true);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

    } catch (err) {
      console.error('Camera access error:', err);
      setError('Failed to access camera. Please grant camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setCameraActive(false);
    }
  };

  // ============================================================================
  // Image Capture
  // ============================================================================

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (!blob) return;

      // Create preview URL
      const preview = URL.createObjectURL(blob);
      setCapturedImage(preview);

      // Stop camera after capture
      stopCamera();
    }, 'image/jpeg', 0.95);
  };

  // ============================================================================
  // Confirm/Retake Handlers
  // ============================================================================

  const handleConfirm = () => {
    if (!capturedImage || !canvasRef.current) return;

    canvasRef.current.toBlob((blob) => {
      if (!blob) return;

      // Create File object
      const file = new File([blob], `${imageType}.jpg`, { type: 'image/jpeg' });

      // Pass to parent
      onCapture(file, capturedImage);
    }, 'image/jpeg', 0.95);
  };

  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    startCamera();
  };

  const handleCancel = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    stopCamera();
    onCancel();
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

  const getImageTypeInstructions = (type: ImageType): string => {
    const instructions: Record<ImageType, string> = {
      front_cover: 'Position the front cover of the book in the frame. Make sure the entire cover is visible and well-lit.',
      back_cover: 'Position the back cover of the book in the frame. Ensure the ISBN barcode is clearly visible.',
      spine: 'Position the spine of the book in the frame. Make sure the title and any text on the spine is readable.',
      pages: 'Open the book to show a few pages. Ensure the pages are well-lit and any text or markings are visible.'
    };
    return instructions[type];
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold mb-2">
          Capture {getImageTypeLabel(imageType)}
        </h3>
        <p className="text-sm text-gray-600 max-w-md">
          {getImageTypeInstructions(imageType)}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md">
          {error}
        </div>
      )}

      {/* Camera View */}
      {cameraActive && !capturedImage && (
        <div className="relative mb-4">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full max-w-2xl rounded-lg border-2 border-gray-300"
          />
          
          {/* Capture Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-4 border-2 border-white rounded-lg opacity-50" />
          </div>
        </div>
      )}

      {/* Preview */}
      {capturedImage && (
        <div className="mb-4">
          <img
            src={capturedImage}
            alt="Captured preview"
            className="w-full max-w-2xl rounded-lg border-2 border-gray-300"
          />
        </div>
      )}

      {/* Hidden Canvas for Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Action Buttons */}
      <div className="flex gap-4">
        {cameraActive && !capturedImage && (
          <>
            <button
              onClick={capturePhoto}
              className="px-8 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium"
            >
              Capture Photo
            </button>
            <button
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          </>
        )}

        {capturedImage && (
          <>
            <button
              onClick={handleConfirm}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Use This Photo
            </button>
            <button
              onClick={handleRetake}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Retake
            </button>
          </>
        )}
      </div>

      {/* Tips */}
      {cameraActive && !capturedImage && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg max-w-md">
          <h4 className="font-medium text-gray-900 mb-2">Tips for best results:</h4>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>Ensure good lighting</li>
            <li>Hold the camera steady</li>
            <li>Keep the book flat and in focus</li>
            <li>Avoid shadows and glare</li>
          </ul>
        </div>
      )}
    </div>
  );
}
