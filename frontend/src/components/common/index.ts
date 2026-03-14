/**
 * Common UI components barrel export
 */

export { default as LazyImage } from './LazyImage';
export { default as SkipNav } from './SkipNav';
export { default as MobileNav } from './MobileNav';
export { default as ResponsiveImage } from './ResponsiveImage';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as ErrorMessage, friendlyError } from './ErrorMessage';
export {
    Skeleton,
    ListingCardSkeleton,
    ListingGridSkeleton,
    TableRowSkeleton,
    StatCardSkeleton,
    DetailPageSkeleton,
    Spinner,
    PageLoader,
} from './Skeleton';
export { ToastProvider, useToast } from './Toast';
export type { Toast, ToastVariant } from './Toast';
