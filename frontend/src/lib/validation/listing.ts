/**
 * Listing Validation Schemas
 * 
 * Zod schemas for validating listing data.
 * Requirements: 17.1-17.9
 */

import { z } from 'zod';

// Location schema
export const locationSchema = z.object({
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be a 6-digit number'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// Condition details schema
export const conditionDetailsSchema = z.object({
  cover_damage: z.number().min(1).max(5).optional(),
  page_quality: z.number().min(1).max(5).optional(),
  binding_quality: z.number().min(1).max(5).optional(),
  markings: z.number().min(1).max(5).optional(),
  discoloration: z.number().min(1).max(5).optional(),
  notes: z.string().max(500).optional(),
});

// Create listing schema
export const createListingSchema = z.object({
  // Book information
  book_id: z.string().uuid().optional(),
  isbn: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(500),
  author: z.string().min(1, 'Author is required').max(200),
  publisher: z.string().max(200).optional(),
  edition: z.string().max(100).optional(),
  publication_year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  category_id: z.string().uuid('Invalid category ID'),
  subject: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  
  // Listing details
  original_price: z.number().positive('Original price must be positive'),
  condition_score: z.number().int().min(1).max(5, 'Condition score must be between 1 and 5'),
  condition_details: conditionDetailsSchema.optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed'),
  location: locationSchema,
  
  // Pricing
  final_price: z.number().positive('Final price must be positive'),
  delivery_cost: z.number().nonnegative('Delivery cost must be non-negative'),
  platform_commission: z.number().nonnegative('Platform commission must be non-negative'),
  payment_fees: z.number().nonnegative('Payment fees must be non-negative'),
  seller_payout: z.number().positive('Seller payout must be positive'),
});

// Update listing schema (all fields optional)
export const updateListingSchema = z.object({
  original_price: z.number().positive('Original price must be positive').optional(),
  condition_score: z.number().int().min(1).max(5, 'Condition score must be between 1 and 5').optional(),
  condition_details: conditionDetailsSchema.optional(),
  images: z.array(z.string().url()).min(1, 'At least one image is required').max(10, 'Maximum 10 images allowed').optional(),
  location: locationSchema.optional(),
  final_price: z.number().positive('Final price must be positive').optional(),
  delivery_cost: z.number().nonnegative('Delivery cost must be non-negative').optional(),
  platform_commission: z.number().nonnegative('Platform commission must be non-negative').optional(),
  payment_fees: z.number().nonnegative('Payment fees must be non-negative').optional(),
  seller_payout: z.number().positive('Seller payout must be positive').optional(),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
