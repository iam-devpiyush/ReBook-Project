'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages';

interface CameraCaptureProps {
  imageType: ImageType;
  onCapture: (file: File, preview: string) => void;
  onCancel: () => void;
}

const LABELS: Record<ImageType, string> = {
  front_cover: 'Front Cover',
  back_cover: 'Back Cover',
  spine: 'Spine',
  pages: 'Pages',
};

const INSTRUCTIONS: Record<ImageType, string> = {
  front_cover: 'Position the front cover in the frame. Make sure the entire cover is visible and well-lit.',
  back_cover: 'Position the back cover in the frame. Ensure the ISBN barcode is clearly visible.',
  spine: 'Position the spine in the frame so the title is readable.',
  pages: 'Open the book to show a few pages. Ensure they are well-lit.',
};

export default function CameraCapture({ imageType, onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'choose' | 'camera' | 'preview'>('choose');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setMode('camera');
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings, or use file upload below.'
          : 'Camera not available. Please use file upload below.'
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
    if (mode !== 'camera') stopCamera();
  }, [mode, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `${imageType}.jpg`, { type: 'image/jpeg' });
      setCapturedFile(file);
      setCapturedImage(dataUrl);
      stopCamera();
      setMode('preview');
    }, 'image/jpeg', 0.92);
  };

  const handleConfirm = () => {
    if (!capturedImage || !capturedFile) return;
    onCapture(capturedFile, capturedImage);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setMode('choose');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      onCapture(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col items-center w-full bg-white rounded-xl p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-lg font-semibold mb-1 text-gray-900">Capture {LABELS[imageType]}</h3>
        <p className="text-sm text-gray-600 max-w-md">{INSTRUCTIONS[imageType]}</p>
      </div>

      {/* Choose mode */}
      {mode === 'choose' && (
        <div className="w-full max-w-md space-y-3">
          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {cameraError}
            </div>
          )}
          <button
            onClick={startCamera}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 font-medium text-base"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Use Camera
          </button>

          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-300" />
            <span className="mx-3 text-sm text-gray-500">or</span>
            <div className="flex-grow border-t border-gray-300" />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 text-gray-700 hover:text-green-700 font-medium text-base transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Upload from Device
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            onClick={onCancel}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-800 text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Live camera */}
      {mode === 'camera' && (
        <div className="w-full max-w-2xl">
          <div className="relative mb-4">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl border-2 border-gray-200"
            />
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-6 border-2 border-white rounded-lg opacity-60" />
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={capturePhoto}
              className="px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 font-medium"
            >
              Capture Photo
            </button>
            <button
              onClick={() => setMode('choose')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Back
            </button>
          </div>
          <div className="mt-4 p-3 bg-gray-100 rounded-lg max-w-md mx-auto">
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>Ensure good lighting — avoid shadows and glare</li>
              <li>Hold steady and keep the book flat in frame</li>
            </ul>
          </div>
        </div>
      )}

      {/* Preview after capture */}
      {mode === 'preview' && capturedImage && (
        <div className="w-full max-w-2xl">
          <img
            src={capturedImage}
            alt="Captured preview"
            className="w-full rounded-xl border-2 border-gray-200 mb-4"
          />
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleConfirm}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Use This Photo
            </button>
            <button
              onClick={handleRetake}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
            >
              Retake
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
