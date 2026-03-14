/**
 * Moderation Log Service
 *
 * Handles creating and querying moderation log entries whenever an admin
 * takes an action (approve/reject listing, suspend user, warn seller, etc.).
 *
 * Requirements: 3.9, 9.11
 */

import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export type ModerationTargetType = 'listing' | 'user' | 'order';

export type ModerationActionType =
  | 'approve'
  | 'reject'
  | 'request_rescan'
  | 'suspend_user'
  | 'warn_seller'
  | 'limit_listings'
  | 'resolve_dispute'
  | 'issue_refund';

export interface LogModerationActionParams {
  admin_id: string;
  action: ModerationActionType;
  target_type: ModerationTargetType;
  target_id: string;
  reason?: string;
  notes?: string;
}

export interface ModerationLogEntry {
  id: string;
  admin_id: string;
  action: ModerationActionType;
  target_type: ModerationTargetType;
  target_id: string;
  reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface LogModerationActionResult {
  success: boolean;
  log?: ModerationLogEntry;
  error?: string;
}

/**
 * Log a moderation action taken by an admin.
 *
 * Stores admin_id, action, target_type, target_id, reason, notes, and
 * timestamp in the moderation_logs table in Supabase.
 *
 * Requirements: 3.9 - When an admin takes any moderation action, the system
 * shall create a moderation log entry.
 */
export async function logModerationAction(
  params: LogModerationActionParams
): Promise<LogModerationActionResult> {
  const { admin_id, action, target_type, target_id, reason, notes } = params;

  try {
    logger.info(
      `Logging moderation action: ${action} on ${target_type} ${target_id} by admin ${admin_id}`
    );

    const insertData = {
      admin_id,
      action,
      target_type,
      target_id,
      reason: reason ?? null,
      notes: notes ?? null,
    };

    const { data, error } = await supabase
      .from('moderation_logs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('Failed to create moderation log entry:', error);
      return {
        success: false,
        error: `Failed to create moderation log: ${error.message}`,
      };
    }

    logger.info(`Moderation log created with id: ${(data as any).id}`);

    return {
      success: true,
      log: data as ModerationLogEntry,
    };
  } catch (err) {
    logger.error('Unexpected error logging moderation action:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
