'use client';

/**
 * SkipNav — keyboard-accessible skip-to-main-content link.
 * Renders visually hidden until focused, then appears at top of page.
 * Requirements: Accessibility compliance (Task 57.3)
 */

export default function SkipNav() {
    return (
        <a
            href="#main-content"
            className="
        sr-only focus:not-sr-only
        focus:fixed focus:top-2 focus:left-2 focus:z-[9999]
        focus:px-4 focus:py-2
        focus:bg-blue-600 focus:text-white
        focus:rounded-lg focus:font-medium focus:text-sm
        focus:shadow-lg focus:outline-none
        focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600
      "
        >
            Skip to main content
        </a>
    );
}
