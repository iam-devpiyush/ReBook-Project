'use client';

/**
 * MobileNav — bottom navigation bar for mobile devices.
 * Provides thumb-friendly navigation with 44px+ touch targets.
 * Requirements: Mobile UX (Task 57.4)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
    href: string;
    label: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    {
        href: '/search',
        label: 'Browse',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        href: '/seller',
        label: 'Sell',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v16m8-8H4" />
            </svg>
        ),
    },
    {
        href: '/orders',
        label: 'Orders',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
        ),
    },
    {
        href: '/wishlist',
        label: 'Wishlist',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
        ),
    },
    {
        href: '/dashboard',
        label: 'Profile',
        icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
        ),
    },
];

export default function MobileNav() {
    const pathname = usePathname();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden"
            aria-label="Mobile navigation"
        >
            <ul className="flex items-stretch" role="list">
                {NAV_ITEMS.map(item => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                    return (
                        <li key={item.href} className="flex-1">
                            <Link
                                href={item.href}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                className={`
                  flex flex-col items-center justify-center gap-1 py-2 px-1
                  min-h-[56px] w-full text-xs font-medium transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
                  ${isActive
                                        ? 'text-blue-600'
                                        : 'text-gray-500 hover:text-gray-800 active:text-blue-600'
                                    }
                `}
                            >
                                <span className={isActive ? 'text-blue-600' : 'text-gray-400'} aria-hidden="true">
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
