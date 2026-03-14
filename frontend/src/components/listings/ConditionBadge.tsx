/**
 * ConditionBadge Component
 * 
 * Displays condition score (1-5) with visual indicators.
 * Shows color-coded badge and condition label.
 * 
 * Requirements: Condition display
 */

'use client';

interface ConditionBadgeProps {
  conditionScore: number; // 1-5
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const CONDITION_CONFIG = {
  5: {
    label: 'Like New',
    color: 'bg-green-500',
    textColor: 'text-green-700',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-500',
  },
  4: {
    label: 'Very Good',
    color: 'bg-lime-500',
    textColor: 'text-lime-700',
    bgLight: 'bg-lime-50',
    borderColor: 'border-lime-500',
  },
  3: {
    label: 'Good',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-500',
  },
  2: {
    label: 'Acceptable',
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    bgLight: 'bg-orange-50',
    borderColor: 'border-orange-500',
  },
  1: {
    label: 'Poor',
    color: 'bg-red-500',
    textColor: 'text-red-700',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-500',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    score: 'text-sm',
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    score: 'text-base',
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    score: 'text-lg',
  },
};

export default function ConditionBadge({
  conditionScore,
  size = 'md',
  showLabel = true,
}: ConditionBadgeProps) {
  // Validate condition score
  const validScore = Math.max(1, Math.min(5, Math.round(conditionScore)));
  const config = CONDITION_CONFIG[validScore as keyof typeof CONDITION_CONFIG];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className="inline-flex items-center gap-2">
      {/* Score Badge */}
      <div
        className={`
          ${config.bgLight} ${config.borderColor} ${config.textColor}
          border-2 rounded-full font-bold
          flex items-center justify-center
          ${size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-10 h-10' : 'w-12 h-12'}
        `}
      >
        <span className={sizeConfig.score}>{validScore}</span>
      </div>

      {/* Condition Label */}
      {showLabel && (
        <span
          className={`
            ${config.color} text-white
            ${sizeConfig.badge}
            rounded-full font-medium
          `}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}
