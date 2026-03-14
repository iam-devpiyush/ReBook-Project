/**
 * Listing Type Definitions
 * 
 * Types for book listings in the marketplace.
 * Requirements: 2.1-2.10, 3.1, 3.2
 */

export interface Location {
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
}

export interface ConditionDetails {
  cover_damage?: number; // 1-5 score
  page_quality?: number; // 1-5 score
  binding_quality?: number; // 1-5 score
  markings?: number; // 1-5 score
  discoloration?: number; // 1-5 score
  notes?: string;
}

export type ListingStatus = 
  | 'pending_approval' 
  | 'active' 
  | 'sold' 
  | 'rejected' 
  | 'rescan_required' 
  | 'inactive';

export interface CreateListingRequest {
  // Book information
  book_id?: string; // If book already exists
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  publication_year?: number;
  category_id: string;
  subject?: string;
  description?: string;
  
  // Listing details
  original_price: number;
  condition_score: number; // 1-5
  condition_details?: ConditionDetails;
  images: string[]; // Array of image URLs from Supabase Storage
  location: Location;
  
  // Pricing (calculated by pricing engine)
  final_price: number;
  delivery_cost: number;
  platform_commission: number;
  payment_fees: number;
  seller_payout: number;
}

export interface Listing {
  id: string;
  book_id: string;
  seller_id: string;
  original_price: number;
  condition_score: number;
  condition_details: ConditionDetails | null;
  suggested_price: number | null;
  final_price: number;
  delivery_cost: number;
  platform_commission: number;
  payment_fees: number;
  seller_payout: number;
  status: ListingStatus;
  rejection_reason: string | null;
  images: string[];
  location: Location | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  views: number;
  is_featured: boolean;
}

export interface ListingWithBook extends Listing {
  book: {
    id: string;
    isbn: string | null;
    title: string;
    author: string;
    publisher: string | null;
    edition: string | null;
    publication_year: number | null;
    category_id: string;
    subject: string | null;
    description: string | null;
    cover_image: string | null;
  };
  seller: {
    id: string;
    name: string;
    email: string;
    profile_picture: string | null;
    rating: number | null;
  };
}

export interface UpdateListingRequest {
  original_price?: number;
  condition_score?: number;
  condition_details?: ConditionDetails;
  images?: string[];
  location?: Location;
  final_price?: number;
  delivery_cost?: number;
  platform_commission?: number;
  payment_fees?: number;
  seller_payout?: number;
}
