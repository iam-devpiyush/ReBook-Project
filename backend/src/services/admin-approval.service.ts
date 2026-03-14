/**
 * Admin Approval Service
 * 
 * Handles admin moderation actions for listings including:
 * - Approving listings (status -> active)
 * - Rejecting listings (status -> rejected)
 * - Requesting rescan (status -> rescan_required)
 * - Creating moderation logs
 * - Publishing Supabase Realtime notifications
 * - Managing Meilisearch index
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import {
  addToMeilisearchIndex,
  removeFromMeilisearchIndex,
  ListingDocument,
} from './search.service';

export type AdminAction = 'approve' | 'reject' | 'request_rescan';

export interface ProcessAdminApprovalParams {
  listingId: string;
  adminId: string;
  action: AdminAction;
  reason?: string;
  notes?: string;
}

export interface AdminApprovalResult {
  success: boolean;
  listing?: any;
  error?: string;
}

/**
 * Process admin approval action for a listing
 * 
 * Requirements: 3.3-3.11
 * - Validates listing is pending approval
 * - Verifies admin permissions
 * - Updates listing status in Supabase
 * - Creates moderation log entry
 * - Publishes Supabase Realtime notification
 * - Adds/removes from Meilisearch index
 */
export async function processAdminApproval(
  params: ProcessAdminApprovalParams
): Promise<AdminApprovalResult> {
  const { listingId, adminId, action, reason, notes } = params;

  try {
    logger.info(`Processing admin approval: ${action} for listing ${listingId} by admin ${adminId}`);

    // Step 1: Verify admin permissions
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      logger.error('Admin not found:', adminError);
      return {
        success: false,
        error: 'Admin not found',
      };
    }

    if ((admin as any).role !== 'admin') {
      logger.error(`User ${adminId} is not an admin`);
      return {
        success: false,
        error: 'User does not have admin permissions',
      };
    }

    // Step 2: Fetch the listing and validate status
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, books(*), users!seller_id(*)')
      .eq('id', listingId)
      .single();

    if (listingError || !listing) {
      logger.error('Listing not found:', listingError);
      return {
        success: false,
        error: 'Listing not found',
      };
    }

    const listingData = listing as any;

    // Validate listing is pending approval (or rescan_required for re-approval)
    if (listingData.status !== 'pending_approval' && listingData.status !== 'rescan_required') {
      logger.error(`Listing ${listingId} has invalid status: ${listingData.status}`);
      return {
        success: false,
        error: `Listing status must be pending_approval or rescan_required, current status: ${listingData.status}`,
      };
    }

    // Step 3: Process the action
    let newStatus: string;
    let updateData: any = {
      updated_at: new Date().toISOString(),
    };

    switch (action) {
      case 'approve':
        newStatus = 'active';
        updateData.status = newStatus;
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = adminId;
        updateData.rejection_reason = null; // Clear any previous rejection reason
        break;

      case 'reject':
        if (!reason) {
          return {
            success: false,
            error: 'Rejection reason is required',
          };
        }
        newStatus = 'rejected';
        updateData.status = newStatus;
        updateData.rejection_reason = reason;
        break;

      case 'request_rescan':
        newStatus = 'rescan_required';
        updateData.status = newStatus;
        // Store notes in rejection_reason field for rescan requests
        if (notes) {
          updateData.rejection_reason = notes;
        }
        break;

      default:
        return {
          success: false,
          error: `Invalid action: ${action}`,
        };
    }

    // Step 4: Update listing in database
    const { data: updatedListing, error: updateError } = await supabase
      .from('listings')
      .update(updateData)
      .eq('id', listingId)
      .select('*, books(*), users!seller_id(*)')
      .single() as any;

    if (updateError || !updatedListing) {
      logger.error('Failed to update listing:', updateError);
      return {
        success: false,
        error: 'Failed to update listing',
      };
    }

    const updatedListingData = updatedListing as any;

    // Step 5: Create moderation log entry
    const moderationLogData = {
      admin_id: adminId,
      action,
      target_type: 'listing' as const,
      target_id: listingId,
      reason: reason || null,
      notes: notes || null,
    };

    const { error: logError } = await supabase
      .from('moderation_logs')
      .insert(moderationLogData as any);

    if (logError) {
      logger.error('Failed to create moderation log:', logError);
      // Don't fail the entire operation if logging fails
    }

    // Step 6: Manage Meilisearch index
    if (action === 'approve') {
      // Add to Meilisearch index
      try {
        const listingDoc: ListingDocument = {
          id: updatedListingData.id,
          book_id: updatedListingData.book_id,
          seller_id: updatedListingData.seller_id,
          title: updatedListingData.books.title,
          author: updatedListingData.books.author,
          subject: updatedListingData.books.subject || undefined,
          isbn: updatedListingData.books.isbn || undefined,
          publisher: updatedListingData.books.publisher || undefined,
          description: updatedListingData.books.description || undefined,
          status: updatedListingData.status,
          category_id: updatedListingData.books.category_id,
          condition_score: updatedListingData.condition_score,
          final_price: updatedListingData.final_price,
          original_price: updatedListingData.original_price,
          delivery_cost: updatedListingData.delivery_cost,
          images: updatedListingData.images,
          location: {
            city: updatedListingData.city || '',
            state: updatedListingData.state || '',
            pincode: updatedListingData.pincode || '',
            latitude: updatedListingData.latitude || undefined,
            longitude: updatedListingData.longitude || undefined,
          },
          created_at: updatedListingData.created_at,
          updated_at: updatedListingData.updated_at,
        };

        await addToMeilisearchIndex(listingDoc);
        logger.info(`Added listing ${listingId} to Meilisearch index`);
      } catch (indexError) {
        logger.error('Failed to add listing to Meilisearch:', indexError);
        // Don't fail the entire operation if indexing fails
      }
    } else {
      // Remove from Meilisearch index for reject or rescan
      try {
        await removeFromMeilisearchIndex(listingId);
        logger.info(`Removed listing ${listingId} from Meilisearch index`);
      } catch (indexError) {
        logger.error('Failed to remove listing from Meilisearch:', indexError);
        // Don't fail the entire operation if index removal fails
      }
    }

    // Step 7: Publish Supabase Realtime notification
    // Supabase Realtime automatically broadcasts database changes
    // The seller can subscribe to changes on the listings table filtered by seller_id
    // No explicit broadcast needed - Supabase handles this via database triggers

    logger.info(`Successfully processed ${action} for listing ${listingId}`);

    return {
      success: true,
      listing: updatedListing,
    };
  } catch (error) {
    logger.error('Error processing admin approval:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get pending listings for admin review
 */
export async function getPendingListings(
  page: number = 1,
  pageSize: number = 20
): Promise<{ listings: any[]; total: number; error?: string }> {
  try {
    const offset = (page - 1) * pageSize;

    // Get total count
    const { count, error: countError } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending_approval');

    if (countError) {
      logger.error('Failed to count pending listings:', countError);
      return { listings: [], total: 0, error: 'Failed to count pending listings' };
    }

    // Get paginated listings
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('*, books(*), users!seller_id(*)')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (listingsError) {
      logger.error('Failed to fetch pending listings:', listingsError);
      return { listings: [], total: 0, error: 'Failed to fetch pending listings' };
    }

    return {
      listings: listings || [],
      total: count || 0,
    };
  } catch (error) {
    logger.error('Error fetching pending listings:', error);
    return {
      listings: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
