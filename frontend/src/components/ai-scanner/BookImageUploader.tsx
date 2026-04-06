'use client';

/**
 * BookImageUploader
 *
 * Guided step-by-step image upload.
 * After each upload, calls Gemini Vision to verify the image matches
 * the expected type. If invalid, shows the reason and asks to retake.
 */

import { useState, useRef, useCallback } from 'react';

export type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages';

export interface UploadedImages {
  front_cover: string;
  back_cover: string;
  spine: string;
  pages: string;
}

interface Step {
  key: ImageType;
  label: string;
  hint: string;
  icon: string;
}

/** Resize a data URL to max px on the longest side using Canvas API */
function resizeImageForValidation(dataUrl: string, maxPx: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const STEPS: Step[] = [
  {
    key: 'front_cover',
    label: 'Front Cover',
    hint: 'Photograph the front cover clearly — title and author should be visible.',
    icon: '📖',
  },
  {
    key: 'back_cover',
    label: 'Back Cover',
    hint: 'Photograph the back cover. Keep the ISBN barcode in frame if visible.',
    icon: '🔖',
  },
  {
    key: 'spine',
    label: 'Spine',
    hint: 'Hold the book upright and photograph the narrow spine.',
    icon: '📚',
  },
  {
    key: 'pages',
    label: 'Inside Pages',
    hint: 'Open to any page and photograph it to show page quality.',
    icon: '📄',
  },
];

type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid';

interface Props {
  onComplete: (images: UploadedImages) => void;
  onCancel: () => void;
}

export default function BookImageUploader({ onComplete, onCancel }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [images, setImages] = useState<Partial<UploadedImages>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [validation, setValidation] = useState<ValidationState>('idle');
  const [validationReason, setValidationReason] = useState<string>('');
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setValidation('idle');
    setValidationReason('');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be under 5 MB.');
      return;
    }

    // Read as data URL
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    });

    setPreview(dataUrl);
    e.target.value = '';

    // Resize to max 1200px before storing — keeps file size small enough to send
    // as base64 JSON (4 images × ~200KB ≈ well under the 10 MB body limit) while
    // retaining enough detail for Gemini to read ISBN barcodes and cover text.
    const resizedUrl = await resizeImageForValidation(dataUrl, 1200);
    setPreview(resizedUrl);

    // Auto-validate with Gemini Vision — checks image matches the expected step
    setValidation('validating');
    try {
      const res = await fetch('/api/ai/validate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: resizedUrl, image_type: currentStep.key }),
      });
      const json = await res.json();

      // Treat auth errors or unexpected responses as unavailable — don't block user
      if (!res.ok || json.error) {
        setValidation('valid');
        setValidationReason('Image accepted');
        setApiUnavailable(false);
      } else if (json.valid) {
        setValidation('valid');
        setValidationReason(json.reason || 'Image looks good');
        setApiUnavailable(false);
      } else if (json.api_unavailable) {
        setValidation('valid');
        setValidationReason('Image accepted (AI validation unavailable)');
        setApiUnavailable(true);
      } else {
        setValidation('invalid');
        setApiUnavailable(false);
        setValidationReason(json.reason || 'This does not look like the correct image. Please upload the correct photo.');
      }
    } catch {
      // Network error — allow through
      setValidation('valid');
      setValidationReason('Image accepted');
      setApiUnavailable(false);
    }
  }, [currentStep.key]);

  const handleRetake = () => {
    setPreview(null);
    setValidation('idle');
    setValidationReason('');
    setApiUnavailable(false);
    setUploadError(null);
  };

  const handleNext = () => {
    if (!preview || validation !== 'valid') return;

    const updatedImages = { ...images, [currentStep.key]: preview };

    if (isLastStep) {
      onComplete(updatedImages as UploadedImages);
    } else {
      setImages(updatedImages);
      setPreview(null);
      setValidation('idle');
      setValidationReason('');
      setApiUnavailable(false);
      setUploadError(null);
      setStepIndex(i => i + 1);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
              i < stepIndex ? 'bg-green-500 text-white' :
              i === stepIndex ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < stepIndex ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-1 rounded ${i < stepIndex ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step header */}
      <div className="text-center mb-5">
        <span className="text-4xl">{currentStep.icon}</span>
        <h2 className="text-xl font-bold text-gray-900 mt-2">
          Step {stepIndex + 1} of {STEPS.length}: {currentStep.label}
        </h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{currentStep.hint}</p>
      </div>

      {/* Upload area */}
      {!preview ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
        >
          <div className="text-5xl mb-3">📷</div>
          <p className="font-medium text-gray-700">Click to upload photo</p>
          <p className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP · max 5 MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-gray-200">
          <img src={preview} alt={currentStep.label} className="w-full max-h-64 object-contain bg-gray-50" />

          {/* Validation status bar */}
          <div className={`px-4 py-3 border-t flex items-center gap-3 ${
            validation === 'validating' ? 'bg-blue-50 border-blue-100' :
            validation === 'valid' ? 'bg-green-50 border-green-100' :
            validation === 'invalid' ? 'bg-red-50 border-red-100' :
            'bg-gray-50 border-gray-100'
          }`}>
            {validation === 'validating' && (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent flex-shrink-0" />
                <span className="text-sm text-blue-700">Verifying image...</span>
              </>
            )}
            {validation === 'valid' && (
              <>
                <span className="text-green-600 text-lg flex-shrink-0">✓</span>
                <span className="text-sm text-green-700 flex-1">{validationReason}</span>
                <button onClick={handleRetake} className="text-xs text-gray-400 underline hover:text-gray-600">
                  Retake
                </button>
              </>
            )}
            {validation === 'invalid' && (
              <div className="flex-1">
                {apiUnavailable ? (
                  <>
                    <p className="text-sm font-semibold text-orange-700 mb-1">⚠️ Validation service error</p>
                    <p className="text-xs text-orange-600 mb-2">{validationReason}</p>
                    <button
                      onClick={handleRetake}
                      className="mt-1 px-4 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-lg hover:bg-orange-700"
                    >
                      Try Again
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-red-700 mb-1">❌ Wrong image</p>
                    <p className="text-xs text-red-600 mb-2">{validationReason}</p>
                    <button
                      onClick={handleRetake}
                      className="mt-1 px-4 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700"
                    >
                      Upload Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {uploadError && (
        <p className="mt-3 text-sm text-red-600 text-center">{uploadError}</p>
      )}

      {/* Confirmed thumbnails */}
      {Object.keys(images).length > 0 && (
        <div className="mt-4 flex gap-2">
          {STEPS.slice(0, stepIndex).map(s => (
            <div key={s.key} className="relative">
              <img src={images[s.key]} alt={s.label}
                className="w-14 h-14 object-cover rounded-lg border-2 border-green-400" />
              <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">✓</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex gap-3">
        <button onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={validation !== 'valid'}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
            validation === 'valid'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {validation === 'validating' ? 'Verifying...' :
           validation === 'invalid' ? 'Upload correct image first' :
           isLastStep ? 'Scan Book →' : `Next: ${STEPS[stepIndex + 1].label} →`}
        </button>
      </div>
    </div>
  );
}
