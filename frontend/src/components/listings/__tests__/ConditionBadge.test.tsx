/**
 * Unit Tests for ConditionBadge Component
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect } from 'vitest';
import ConditionBadge from '../ConditionBadge';

describe('ConditionBadge', () => {
  describe('Condition Score Display', () => {
    it('should display condition score 5 as "Like New" with green badge', () => {
      render(<ConditionBadge conditionScore={5} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Like New')).toBeInTheDocument();
    });

    it('should display condition score 4 as "Very Good" with lime badge', () => {
      render(<ConditionBadge conditionScore={4} />);
      
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Very Good')).toBeInTheDocument();
    });

    it('should display condition score 3 as "Good" with yellow badge', () => {
      render(<ConditionBadge conditionScore={3} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('should display condition score 2 as "Acceptable" with orange badge', () => {
      render(<ConditionBadge conditionScore={2} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Acceptable')).toBeInTheDocument();
    });

    it('should display condition score 1 as "Poor" with red badge', () => {
      render(<ConditionBadge conditionScore={1} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });
  });

  describe('Score Validation', () => {
    it('should clamp score below 1 to 1', () => {
      render(<ConditionBadge conditionScore={0} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Poor')).toBeInTheDocument();
    });

    it('should clamp score above 5 to 5', () => {
      render(<ConditionBadge conditionScore={6} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Like New')).toBeInTheDocument();
    });

    it('should round decimal scores to nearest integer', () => {
      render(<ConditionBadge conditionScore={3.7} />);
      
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('Very Good')).toBeInTheDocument();
    });
  });

  describe('Size Variants', () => {
    it('should render small size variant', () => {
      const { container } = render(<ConditionBadge conditionScore={5} size="sm" />);
      
      expect(container.querySelector('.w-8')).toBeInTheDocument();
    });

    it('should render medium size variant (default)', () => {
      const { container } = render(<ConditionBadge conditionScore={5} />);
      
      expect(container.querySelector('.w-10')).toBeInTheDocument();
    });

    it('should render large size variant', () => {
      const { container } = render(<ConditionBadge conditionScore={5} size="lg" />);
      
      expect(container.querySelector('.w-12')).toBeInTheDocument();
    });
  });

  describe('Label Display', () => {
    it('should show label by default', () => {
      render(<ConditionBadge conditionScore={5} />);
      
      expect(screen.getByText('Like New')).toBeInTheDocument();
    });

    it('should hide label when showLabel is false', () => {
      render(<ConditionBadge conditionScore={5} showLabel={false} />);
      
      expect(screen.queryByText('Like New')).not.toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
