/**
 * Platform Stats Service (Frontend Export)
 * 
 * Re-exports the platform stats service from the backend for use in API routes.
 */

export {
  calculatePlatformStats,
  getPlatformStats,
  getPlatformStatsRange,
  type PlatformStats,
  type CalculatePlatformStatsResult,
} from '../../../backend/src/services/platform-stats.service';
