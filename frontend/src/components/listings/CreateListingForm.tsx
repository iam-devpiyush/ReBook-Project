/**
 * CreateListingForm Component
 * 
 * Multi-step form for creating book listings:
 * - Step 1: Use EnhancedAIScannerComponent for image capture
 * - Step 2: Display auto-filled book details (or manual entry if ISBN not detected)
 * - Step 3: Review condition score and pricing breakdown
 * - Step 4: Confirm and submit listing
 * 
 * Uses react-hook-form for form state management and Zod for validation.
 * 
 * Requirements: 2.1-2.12
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import EnhancedAIScanner from '@/components/ai-scanner/EnhancedAIScanner';
import ConditionBadge from './ConditionBadge';
import PricingBreakdownDisplay from './PricingBreakdownDisplay';
import { createListingSchema } from '@/lib/validation/listing';
import type { CreateListingRequest } from '@/types/listing';
import type { PricingBreakdown } from '@/types/pricing';
import type { BookMetadata } from '@/lib/ai-scanner/metadata-fetcher';
import type { ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';

// ============================================================================
// Type Definitions
// ============================================================================

type ImageType = 'front_cover' | 'back_cover' | 'spine' | 'pages';

interface ScanResult {
  detected_isbn: string | null;
  book_metadata: BookMetadata | null;
  condition_analysis: ConditionAnalysis;
}

type FormData = z.infer<typeof createListingSchema>;

// ============================================================================
// Component
// ============================================================================

export default function CreateListingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<ImageType, string> | null>(null);
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [isCalculatingPricing, setIsCalculatingPricing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form setup with react-hook-form and Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    getValues,
  } = useForm<FormData>({
    resolver: zodResolver(createListingSchema),
    mode: 'onChange',
  });

  const watchedOriginalPrice = watch('original_price');
  const watchedConditionScore = watch('condition_score');
  const watchedLocation = watch('location');

  // ============================================================================
  // Step 1: AI Scanner Complete Handler
  // ============================================================================

  const handleScanComplete = (result: ScanResult, urls: Record<ImageType, string>) => {
    setScanResult(result);
    setImageUrls(urls);

    // Auto-fill form with scan results
    if (result.book_metadata) {
      setValue('title', result.book_metadata.title);
      setValue('author', result.book_metadata.author);
      if (result.book_metadata.publisher) {
        setValue('publisher', result.book_metadata.publisher);
      }
      if (result.book_metadata.edition) {
        setValue('edition', result.book_metadata.edition);
      }
      if (result.book_metadata.publication_year) {
        setValue('publication_year', result.book_metadata.publication_year);
      }
    }

    if (result.detected_isbn) {
      setValue('isbn', result.detected_isbn);
    }

    // Set condition score from AI analysis
    setValue('condition_score', result.condition_analysis.overall_score);

    // Set condition details
    setValue('condition_details', {
      cover_damage: result.condition_analysis.cover_damage,
      page_quality: result.condition_analysis.page_quality,
      binding_quality: result.condition_analysis.binding_quality,
      markings: result.condition_analysis.markings || undefined,
      discoloration: result.condition_analysis.discoloration || undefined,
      notes: result.condition_analysis.notes || undefined,
    });

    // Set image URLs
    const imageArray = [
      urls.front_cover,
      urls.back_cover,
      urls.spine,
      urls.pages,
    ];
    setValue('images', imageArray);

    // Move to step 2
    setCurrentStep(2);
  };

  // ============================================================================
  // Step 2: Calculate Pricing
  // ============================================================================

  const handleCalculatePricing = async () => {
    const formData = getValues();

    // Validate required fields
    if (!formData.original_price || !formData.condition_score || !formData.location) {
      setError('Please fill in all required fields');
      return;
    }

    setIsCalculatingPricing(true);
    setError(null);

    try {
      // Call pricing API
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original_price: formData.original_price,
          condition_score: formData.condition_score,
          seller_location: formData.location,
          buyer_location: formData.location, // Use seller location as default for estimation
          weight: 0.5, // Default book weight
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to calculate pricing');
      }

      const data = await response.json();
      setPricingBreakdown(data.data);

      // Set pricing fields in form
      setValue('final_price', data.data.final_price);
      setValue('delivery_cost', data.data.delivery_cost);
      setValue('platform_commission', data.data.platform_commission);
      setValue('payment_fees', data.data.payment_fees);
      setValue('seller_payout', data.data.seller_payout);

      // Move to step 3
      setCurrentStep(3);
    } catch (err) {
      console.error('Pricing calculation error:', err);
      setError('Failed to calculate pricing. Please try again.');
    } finally {
      setIsCalculatingPricing(false);
    }
  };

  // ============================================================================
  // Step 4: Submit Listing
  // ============================================================================

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    // Ensure title/author are never empty strings
    if (!data.title || !data.title.trim()) data.title = 'Unknown Title';
    if (!data.author || !data.author.trim()) data.author = 'Unknown Author';

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create listing');
      }

      const result = await response.json();

      // Redirect to seller portal
      router.push(`/seller`);
    } catch (err: any) {
      console.error('Listing submission error:', err);
      setError(err.message || 'Failed to create listing. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // Render Steps
  // ============================================================================

  const renderStep1 = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Step 1: Scan Your Book</h2>
      <p className="text-gray-600 mb-6">
        Use your camera to capture images of your book. Our AI will automatically detect the ISBN
        and analyze the condition.
      </p>
      <EnhancedAIScanner
        onComplete={handleScanComplete}
        onCancel={() => router.back()}
      />
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Step 2: Book Details</h2>
      <p className="text-gray-600 mb-6">
        {scanResult?.book_metadata
          ? 'Review the auto-filled details or edit as needed.'
          : 'Please enter the book details manually.'}
      </p>

      <form className="space-y-6">
        {/* ISBN */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ISBN {scanResult?.detected_isbn && '(Auto-detected)'}
          </label>
          <input
            type="text"
            {...register('isbn')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter ISBN (optional)"
          />
          {errors.isbn && (
            <p className="mt-1 text-sm text-red-600">{errors.isbn.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('title')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter book title"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        {/* Author */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            {...register('author')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter author name"
          />
          {errors.author && (
            <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>
          )}
        </div>

        {/* Publisher */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Publisher</label>
          <input
            type="text"
            {...register('publisher')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter publisher (optional)"
          />
        </div>

        {/* Edition */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Edition</label>
          <input
            type="text"
            {...register('edition')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter edition (optional)"
          />
        </div>

        {/* Publication Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Publication Year
          </label>
          <input
            type="number"
            {...register('publication_year', {
              setValueAs: (v) => (v === '' || v === null || isNaN(Number(v)) ? undefined : Number(v))
            })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter year (optional)"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category_id')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            <option value="fiction">Fiction</option>
            <option value="non-fiction">Non-Fiction</option>
            <option value="textbook">Textbook</option>
            <option value="science">Science</option>
            <option value="technology">Technology</option>
            <option value="history">History</option>
            <option value="biography">Biography</option>
            <option value="children">Children</option>
            <option value="other">Other</option>
          </select>
          {errors.category_id && (
            <p className="mt-1 text-sm text-red-600">{errors.category_id.message}</p>
          )}
        </div>

        {/* Original Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Original Price (₹) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('original_price', { valueAsNumber: true })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter original price"
          />
          {errors.original_price && (
            <p className="mt-1 text-sm text-red-600">{errors.original_price.message}</p>
          )}
        </div>

        {/* Location */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Location</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('location.city')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter city"
            />
            {errors.location?.city && (
              <p className="mt-1 text-sm text-red-600">{errors.location.city.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('location.state')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter state"
            />
            {errors.location?.state && (
              <p className="mt-1 text-sm text-red-600">{errors.location.state.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('location.pincode')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter 6-digit pincode"
              maxLength={6}
            />
            {errors.location?.pincode && (
              <p className="mt-1 text-sm text-red-600">{errors.location.pincode.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            {...register('description')}
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add any additional details about the book (optional)"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleCalculatePricing}
            disabled={isCalculatingPricing}
            className={`flex-1 px-6 py-3 rounded-lg font-medium ${isCalculatingPricing
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            {isCalculatingPricing ? 'Calculating...' : 'Calculate Pricing'}
          </button>
        </div>
      </form>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Step 3: Review Condition & Pricing</h2>
      <p className="text-gray-600 mb-6">
        Review the condition assessment and pricing breakdown before submitting.
      </p>

      <div className="space-y-6">
        {/* Condition Score */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Condition Assessment</h3>
          <div className="flex items-center gap-4 mb-4">
            <ConditionBadge conditionScore={watchedConditionScore} size="lg" />
          </div>

          {scanResult?.condition_analysis && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Cover Damage:</span>
                <span className="font-medium">
                  {scanResult.condition_analysis.cover_damage}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Page Quality:</span>
                <span className="font-medium">
                  {scanResult.condition_analysis.page_quality}/5
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Binding Quality:</span>
                <span className="font-medium">
                  {scanResult.condition_analysis.binding_quality}/5
                </span>
              </div>
              {scanResult.condition_analysis.notes && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-gray-600">{scanResult.condition_analysis.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        {pricingBreakdown && (
          <PricingBreakdownDisplay pricing={pricingBreakdown} showSellerPayout={true} />
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setCurrentStep(4)}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            Continue to Confirmation
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-gray-900">Step 4: Confirm & Submit</h2>
      <p className="text-gray-600 mb-6">
        Review all details and submit your listing for admin approval.
      </p>

      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Listing Summary</h3>

          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Title:</span>
              <p className="font-medium text-gray-900">{watch('title')}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Author:</span>
              <p className="font-medium text-gray-900">{watch('author')}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Condition:</span>
              <div className="mt-2">
                <ConditionBadge conditionScore={watchedConditionScore} />
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Final Price:</span>
              <p className="text-2xl font-bold text-blue-600">
                ₹{watch('final_price')?.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">You will receive:</span>
              <p className="text-xl font-bold text-green-600">
                ₹{watch('seller_payout')?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ Admin Approval Required</h4>
          <p className="text-sm text-yellow-800">
            Your listing will be submitted for admin review. You'll receive a notification once
            it's approved and visible to buyers.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            disabled={isSubmitting}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit(onSubmit, (validationErrors) => {
              const firstError = Object.values(validationErrors)[0];
              const msg = firstError && 'message' in firstError
                ? (firstError as any).message
                : 'Please fill in all required fields before submitting.';
              setError(msg as string);
            })}
            disabled={isSubmitting}
            className={`flex-1 px-6 py-3 rounded-lg font-medium ${isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Listing'}
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                  ${step === currentStep
                    ? 'bg-green-600 text-white ring-4 ring-green-100'
                    : step < currentStep
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }
                `}
              >
                {step < currentStep ? '✓' : step}
              </div>
              {step < 4 && (
                <div
                  className={`w-16 h-1 mx-2 ${step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-sm">
          <span className={currentStep === 1 ? 'font-semibold text-green-600' : 'text-gray-500'}>Scan</span>
          <span className={currentStep === 2 ? 'font-semibold text-green-600' : 'text-gray-500'}>Details</span>
          <span className={currentStep === 3 ? 'font-semibold text-green-600' : 'text-gray-500'}>Review</span>
          <span className={currentStep === 4 ? 'font-semibold text-green-600' : 'text-gray-500'}>Confirm</span>
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}
