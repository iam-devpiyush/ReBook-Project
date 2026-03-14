/**
 * ReviewForm Component
 *
 * Allows buyers to submit a review for a seller after order delivery.
 * Includes star rating input (1-5) and comment textarea with validation.
 *
 * Requirements: 12.1-12.7
 */

'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const reviewSchema = z.object({
    rating: z
        .number({ required_error: 'Please select a rating' })
        .int()
        .min(1, 'Rating must be at least 1')
        .max(5, 'Rating must be at most 5'),
    comment: z
        .string()
        .min(1, 'Comment must not be empty')
        .max(500, 'Comment must be at most 500 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ReviewFormProps {
    orderId: string;
    sellerName?: string;
    onSuccess?: (review: { id: string; rating: number; comment: string }) => void;
    onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Star Rating Input
// ---------------------------------------------------------------------------

interface StarRatingProps {
    value: number;
    onChange: (rating: number) => void;
    error?: string;
}

const STAR_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
};

function StarRating({ value, onChange, error }: StarRatingProps) {
    const [hovered, setHovered] = useState(0);

    return (
        <div>
            <div className="flex items-center gap-1" role="group" aria-label="Star rating">
                {[1, 2, 3, 4, 5].map((star) => {
                    const isActive = star <= (hovered || value);
                    return (
                        <button
                            key={star}
                            type="button"
                            aria-label={`${star} star${star !== 1 ? 's' : ''} - ${STAR_LABELS[star]}`}
                            aria-pressed={star === value}
                            onClick={() => onChange(star)}
                            onMouseEnter={() => setHovered(star)}
                            onMouseLeave={() => setHovered(0)}
                            className={`text-3xl transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${isActive ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'
                                }`}
                        >
                            ★
                        </button>
                    );
                })}
                {(hovered || value) > 0 && (
                    <span className="ml-2 text-sm text-gray-600 font-medium">
                        {STAR_LABELS[hovered || value]}
                    </span>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
}

// ---------------------------------------------------------------------------
// ReviewForm Component
// ---------------------------------------------------------------------------

export default function ReviewForm({ orderId, sellerName, onSuccess, onCancel }: ReviewFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ReviewFormData>({
        resolver: zodResolver(reviewSchema),
        defaultValues: { rating: 0 as number, comment: '' },
    });

    const watchedRating = watch('rating');
    const watchedComment = watch('comment');
    const commentLength = watchedComment?.length ?? 0;

    const onSubmit = async (data: ReviewFormData) => {
        setIsSubmitting(true);
        setSubmitError(null);

        try {
            const res = await fetch('/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId, rating: data.rating, comment: data.comment }),
            });

            const json = await res.json();

            if (!res.ok) {
                setSubmitError(json.error ?? 'Failed to submit review');
                return;
            }

            onSuccess?.(json.data);
        } catch {
            setSubmitError('An unexpected error occurred. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-5">
            <div>
                <h2 className="text-lg font-semibold text-gray-900">
                    Leave a Review{sellerName ? ` for ${sellerName}` : ''}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Share your experience to help other buyers.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
                {/* Star Rating */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rating <span className="text-red-500">*</span>
                    </label>
                    <StarRating
                        value={watchedRating}
                        onChange={(v) => setValue('rating', v, { shouldValidate: true })}
                        error={errors.rating?.message}
                    />
                </div>

                {/* Comment */}
                <div>
                    <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Comment <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="review-comment"
                        {...register('comment')}
                        rows={4}
                        maxLength={500}
                        placeholder="Describe your experience with this seller..."
                        className={`w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.comment ? 'border-red-400' : 'border-gray-300'
                            }`}
                    />
                    <div className="flex justify-between mt-1">
                        {errors.comment ? (
                            <p className="text-sm text-red-600">{errors.comment.message}</p>
                        ) : (
                            <span />
                        )}
                        <span
                            className={`text-xs ${commentLength > 480 ? 'text-orange-500' : 'text-gray-400'}`}
                        >
                            {commentLength}/500
                        </span>
                    </div>
                </div>

                {/* Submit error */}
                {submitError && (
                    <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                        {submitError}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Submitting…' : 'Submit Review'}
                    </button>
                </div>
            </form>
        </div>
    );
}
