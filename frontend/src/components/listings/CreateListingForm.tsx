'use client';

/**
 * CreateListingForm
 *
 * Step 1 — Guided image upload (front cover → back cover → spine → pages)
 * Step 2 — AI scans: extracts all book data, condition score, price
 * Step 3 — Show read-only AI results + user fills ONLY: category, description, location
 * Step 4 — Pricing breakdown + confirm & submit
 *
 * Users cannot edit AI-extracted fields (title, author, ISBN, price, condition).
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import BookImageUploader, { type UploadedImages } from '@/components/ai-scanner/BookImageUploader';
import ConditionBadge from './ConditionBadge';
import PricingBreakdownDisplay from './PricingBreakdownDisplay';
import type { PricingBreakdown } from '@/types/pricing';
import type { BookMetadata } from '@/lib/ai-scanner/metadata-fetcher';
import type { ConditionAnalysis } from '@/lib/ai-scanner/condition-analyzer';

interface ScanResult {
  detected_isbn: string | null;
  book_metadata: BookMetadata | null;
  condition_analysis: ConditionAnalysis;
  original_price: number | null;
  price_source: string | null;
  official_cover_image: string | null;
}

// Fields the user must provide manually
interface ManualFields {
  category_id: string;
  description: string;
  city: string;
  state: string;
  pincode: string;
}

const CATEGORIES = [
  'Fiction', 'Non-Fiction', 'Textbook', 'Science', 'Technology',
  'History', 'Biography', 'Children', 'Engineering', 'Medical',
  'Mathematics', 'Commerce', 'Arts', 'Other',
];

export default function CreateListingForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [uploadedImages, setUploadedImages] = useState<UploadedImages | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [manual, setManual] = useState<ManualFields>({
    category_id: '',
    description: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [manualErrors, setManualErrors] = useState<Partial<ManualFields>>({});

  // ── Step 1 → 2: images collected, upload then scan ──────────────────────

  const handleImagesComplete = useCallback(async (images: UploadedImages) => {
    setUploadedImages(images);
    setScanning(true);
    setScanError(null);
    setUploadProgress(null);
    setStep(2);

    try {
      const scanId = crypto.randomUUID();
      setScanId(scanId);

      // ── Phase 1: upload images to Supabase Storage ──────────────────────
      setUploadProgress({ done: 0, total: 4 });

      const uploadRes = await fetch('/api/ai/upload-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scan_id: scanId, images }),
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error || 'Image upload failed');

      const publicUrls: Record<string, string> = uploadJson.public_urls;
      setUploadProgress({ done: 4, total: 4 });

      // ── Phase 2: run AI scan with public URLs ────────────────────────────
      setUploadProgress(null);

      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: publicUrls, scan_id: scanId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Scan failed');

      setScanResult({
        detected_isbn: json.result.detected_isbn,
        book_metadata: json.result.book_metadata,
        condition_analysis: json.result.condition_analysis,
        original_price: json.result.original_price ?? json.result.book_metadata?.original_price ?? null,
        price_source: json.result.price_source ?? json.result.book_metadata?.price_source ?? null,
        official_cover_image: json.result.official_cover_image ?? json.result.book_metadata?.cover_image ?? null,
      });
    } catch (err: any) {
      setScanError(err.message || 'Scan failed. Please try again.');
    } finally {
      setScanning(false);
      setUploadProgress(null);
    }
  }, []);

  // ── Step 3 validation ────────────────────────────────────────────────────

  const validateManual = (): boolean => {
    const errs: Partial<ManualFields> = {};
    if (!manual.category_id) errs.category_id = 'Required';
    if (!manual.city.trim()) errs.city = 'Required';
    if (!manual.state.trim()) errs.state = 'Required';
    if (!/^\d{6}$/.test(manual.pincode)) errs.pincode = 'Must be 6 digits';
    setManualErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Step 3 → 4: calculate pricing ───────────────────────────────────────

  const handleCalculatePricing = async () => {
    if (!validateManual()) return;
    if (!scanResult?.original_price) {
      setFormError('Could not determine the original price. Please rescan with a clearer back cover, or try a book with a visible ISBN barcode.');
      return;
    }
    setCalculatingPrice(true);
    setFormError(null);
    try {
      const location = { city: manual.city, state: manual.state, pincode: manual.pincode };
      const res = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_price: scanResult.original_price,
          condition_score: scanResult.condition_analysis.overall_score,
          seller_location: location,
          buyer_location: location,
          weight: 0.5,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Pricing failed');
      setPricingBreakdown(json.data);
      setStep(4);
    } catch (err: any) {
      setFormError(err.message || 'Failed to calculate pricing.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  // ── Step 4: submit ───────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!scanResult || !pricingBreakdown || !uploadedImages) return;
    setSubmitting(true);
    setFormError(null);

    const meta = scanResult.book_metadata;
    // Official cover image goes first — used as catalogue thumbnail
    // User's actual photos follow for condition verification
    const officialCover = scanResult.official_cover_image;
    const userPhotos = [
      uploadedImages.front_cover,
      uploadedImages.back_cover,
      uploadedImages.spine,
      uploadedImages.pages,
    ];
    const listingImages = officialCover ? [officialCover, ...userPhotos] : userPhotos;

    const payload = {
      isbn: scanResult.detected_isbn || undefined,
      title: meta?.title || 'Unknown Title',
      author: meta?.author || 'Unknown Author',
      publisher: meta?.publisher || undefined,
      edition: meta?.edition || undefined,
      publication_year: meta?.publication_year || undefined,
      category_id: manual.category_id,
      subject: meta?.subject || undefined,
      description: manual.description || undefined,
      original_price: scanResult.original_price!,
      condition_score: scanResult.condition_analysis.overall_score,
      condition_details: {
        cover_damage: scanResult.condition_analysis.cover_damage,
        page_quality: scanResult.condition_analysis.page_quality,
        binding_quality: scanResult.condition_analysis.binding_quality,
        markings: scanResult.condition_analysis.markings,
        discoloration: scanResult.condition_analysis.discoloration,
        notes: scanResult.condition_analysis.notes,
      },
      images: listingImages,
      location: {
        city: manual.city,
        state: manual.state,
        pincode: manual.pincode,
      },
      final_price: pricingBreakdown.final_price,
      delivery_cost: pricingBreakdown.delivery_cost,
      platform_commission: pricingBreakdown.platform_commission,
      payment_fees: pricingBreakdown.payment_fees,
      seller_payout: pricingBreakdown.seller_payout,
      scan_id: scanId ?? undefined,
    };

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create listing');
      router.push('/seller');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create listing.');
      setSubmitting(false);
    }
  };

  // ── helpers ──────────────────────────────────────────────────────────────

  const conditionLabel = (score: number) => {
    if (score >= 5) return 'Like New';
    if (score >= 4) return 'Good';
    if (score >= 3) return 'Fair';
    if (score >= 2) return 'Poor';
    return 'Very Poor';
  };

  // ── Render ───────────────────────────────────────────────────────────────

  const stepLabels = ['Upload Photos', 'Scanning', 'Details', 'Confirm'];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Progress */}
      <div className="flex items-center mb-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              s < step ? 'bg-green-500 text-white' :
              s === step ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
              'bg-gray-200 text-gray-500'
            }`}>
              {s < step ? '✓' : s}
            </div>
            {s < 4 && <div className={`flex-1 h-1 mx-1 ${s < step ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mb-8 px-1">
        {stepLabels.map((l, i) => (
          <span key={l} className={step === i + 1 ? 'text-blue-600 font-semibold' : ''}>{l}</span>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <BookImageUploader
          onComplete={handleImagesComplete}
          onCancel={() => router.back()}
        />
      )}

      {/* ── Step 2: Scanning ── */}
      {step === 2 && (
        <div className="text-center py-16">
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-600 border-t-transparent mx-auto mb-5" />
              {uploadProgress ? (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Uploading images...</h2>
                  <p className="text-sm text-gray-500 mb-3">
                    {uploadProgress.done} of {uploadProgress.total} images uploaded
                  </p>
                  <div className="w-48 mx-auto bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Analysing your book...</h2>
                  <p className="text-sm text-gray-500">Detecting ISBN · Fetching metadata & price · Assessing condition</p>
                </>
              )}
            </>
          ) : scanError ? (
            <>
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Scan failed</h2>
              <p className="text-sm text-red-600 mb-6">{scanError}</p>
              <button onClick={() => setStep(1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                Try Again
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Scan complete!</h2>
              {scanResult?.book_metadata && (
                <p className="text-sm text-gray-600 mb-1 font-semibold">{scanResult.book_metadata.title}</p>
              )}
              {scanResult?.detected_isbn && (
                <p className="text-xs text-gray-400 mb-1">ISBN: {scanResult.detected_isbn}</p>
              )}
              {scanResult?.original_price ? (
                <p className="text-sm text-green-600 font-medium mb-4">
                  MRP: ₹{scanResult.original_price}
                  {scanResult.price_source === 'cover_price' ? ' (from cover)' : ''}
                </p>
              ) : (
                <p className="text-sm text-amber-600 mb-4">⚠️ Price not found — you'll be asked to enter it</p>
              )}
              <button onClick={() => setStep(3)}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700">
                Review Details →
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Read-only AI results + manual fields ── */}
      {step === 3 && scanResult && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Book Details</h2>
          <p className="text-sm text-gray-500 mb-5">Extracted by AI — not editable. Fill in the fields below.</p>

          {/* ── AI-extracted read-only card ── */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-6 space-y-3 text-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Extracted by AI</p>

            <Row label="Title" value={scanResult.book_metadata?.title} />
            <Row label="Author" value={scanResult.book_metadata?.author} />
            <Row label="ISBN" value={scanResult.detected_isbn} />
            <Row label="Publisher" value={scanResult.book_metadata?.publisher} />
            <Row label="Edition" value={scanResult.book_metadata?.edition} />
            <Row label="Year" value={scanResult.book_metadata?.publication_year?.toString()} />
            <Row label="Subject" value={scanResult.book_metadata?.subject} />

            {/* Price */}
            <div className="flex justify-between items-start pt-1 border-t border-gray-200">
              <span className="text-gray-500">Original Price (MRP)</span>
              {scanResult.original_price ? (
                <div className="text-right">
                  <span className="font-semibold text-gray-900">₹{scanResult.original_price}</span>
                  <span className="block text-xs text-gray-400">
                    {scanResult.price_source === 'cover_price' ? 'read from cover' :
                     scanResult.price_source ? scanResult.price_source : ''}
                  </span>
                </div>
              ) : (
                <span className="text-amber-600 font-medium">Not found</span>
              )}
            </div>

            {/* Condition */}
            <div className="flex justify-between items-center pt-1 border-t border-gray-200">
              <span className="text-gray-500">Condition</span>
              <div className="flex items-center gap-2">
                <ConditionBadge conditionScore={scanResult.condition_analysis.overall_score} />
                <span className="text-xs text-gray-500">
                  {conditionLabel(scanResult.condition_analysis.overall_score)}
                </span>
              </div>
            </div>

            {/* Condition breakdown */}
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>Cover: {scanResult.condition_analysis.cover_damage}/5</span>
              <span>Pages: {scanResult.condition_analysis.page_quality}/5</span>
              <span>Binding: {scanResult.condition_analysis.binding_quality}/5</span>
              <span>Markings: {scanResult.condition_analysis.markings}/5</span>
              <span className="col-span-2 text-gray-400 italic mt-1">{scanResult.condition_analysis.notes}</span>
            </div>
          </div>

          {/* ── Price missing warning ── */}
          {!scanResult.original_price && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ Original price not found</p>
              <p>The AI could not detect the MRP from the images or online databases. Please rescan with a clearer photo of the back cover showing the price barcode, or the price sticker.</p>
              <button onClick={() => setStep(1)}
                className="mt-3 px-4 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700">
                Rescan Book
              </button>
            </div>
          )}

          {/* ── Manual fields ── */}
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-700">Fill in the remaining details:</p>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={manual.category_id}
                onChange={e => setManual(m => ({ ...m, category_id: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
              </select>
              {manualErrors.category_id && <p className="mt-1 text-xs text-red-600">{manualErrors.category_id}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={manual.description}
                onChange={e => setManual(m => ({ ...m, description: e.target.value }))}
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                placeholder="Any extra notes about this copy (e.g. minor highlights, missing pages)..."
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Location <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <input
                    type="text"
                    value={manual.city}
                    onChange={e => setManual(m => ({ ...m, city: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                  {manualErrors.city && <p className="mt-1 text-xs text-red-600">{manualErrors.city}</p>}
                </div>
                <div>
                  <input
                    type="text"
                    value={manual.state}
                    onChange={e => setManual(m => ({ ...m, state: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="State"
                  />
                  {manualErrors.state && <p className="mt-1 text-xs text-red-600">{manualErrors.state}</p>}
                </div>
              </div>
              <input
                type="text"
                value={manual.pincode}
                onChange={e => setManual(m => ({ ...m, pincode: e.target.value }))}
                maxLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="6-digit Pincode"
              />
              {manualErrors.pincode && <p className="mt-1 text-xs text-red-600">{manualErrors.pincode}</p>}
            </div>
          </div>

          {formError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
          )}

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep(1)}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              Rescan
            </button>
            <button
              onClick={handleCalculatePricing}
              disabled={calculatingPrice || !scanResult.original_price}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                calculatingPrice || !scanResult.original_price
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {calculatingPrice ? 'Calculating...' : 'Calculate Price & Continue →'}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Confirm ── */}
      {step === 4 && scanResult && pricingBreakdown && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Confirm & Submit</h2>
          <p className="text-sm text-gray-500 mb-5">Review everything before submitting for admin approval.</p>

          <div className="space-y-4">
            {/* Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm">
              <Row label="Title" value={scanResult.book_metadata?.title} />
              <Row label="Author" value={scanResult.book_metadata?.author} />
              {scanResult.detected_isbn && <Row label="ISBN" value={scanResult.detected_isbn} />}
              <Row label="Category" value={manual.category_id} />
              <Row label="Original Price" value={`₹${scanResult.original_price}`} />
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Condition</span>
                <ConditionBadge conditionScore={scanResult.condition_analysis.overall_score} />
              </div>
              <Row label="Location" value={`${manual.city}, ${manual.state} - ${manual.pincode}`} />
            </div>

            {/* Pricing */}
            <PricingBreakdownDisplay pricing={pricingBreakdown} showSellerPayout={true} />

            {/* Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              <span className="font-semibold">⚠️ Admin approval required</span> — your listing will be reviewed before going live.
            </div>

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} disabled={submitting}
                className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                  submitting ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── small helper component ────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right ml-4 max-w-xs">{value}</span>
    </div>
  );
}
