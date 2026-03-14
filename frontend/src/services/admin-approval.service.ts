/**
 * Admin Approval Service (Frontend Export)
 * 
 * Re-exports the admin approval service from the backend for use in API routes.
 * This allows the frontend API routes to access the backend service functions.
 */

export {
  processAdminApproval,
  getPendingListings,
  type AdminAction,
  type ProcessAdminApprovalParams,
  type AdminApprovalResult,
} from '../../../backend/src/services/admin-approval.service';
