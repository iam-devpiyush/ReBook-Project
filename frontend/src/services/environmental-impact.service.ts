/**
 * Environmental Impact Service (Frontend Export)
 *
 * Re-exports the environmental impact service from the backend for use in API routes.
 */

export {
    calculateTreesSaved,
    calculateWaterSaved,
    calculateCO2Reduced,
    calculateEnvironmentalImpact,
    updateUserEcoImpact,
    updatePlatformEcoStats,
    getPlatformImpact,
    getUserImpact,
    type EcoImpact,
    type UserEcoImpact,
    type PlatformEcoImpact,
} from '../../../backend/src/services/environmental-impact.service';
