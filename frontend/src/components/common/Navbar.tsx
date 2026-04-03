'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { useCart } from '@/lib/cart/CartContext';
import { createClient } from '@/lib/supabase/client';

export default function Navbar() {
    const { user, loading, signOut } = useAuth();
    const { count, setOpen: setCartOpen } = useCart();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Fetch role from public.users table
    useEffect(() => {
        if (!user) { setIsAdmin(false); return; }
        // Quick check via email as fallback
        if (user.email === 'admin@rebook.demo') { setIsAdmin(true); return; }
        const supabase = createClient();
        (supabase as any)
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
            .then(({ data, error }: { data: any; error: any }) => {
                if (error) console.warn('Navbar role fetch error:', error.message);
                setIsAdmin(data?.role === 'admin');
            });
    }, [user]);
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSignOut = async () => {
        setDropdownOpen(false);
        setSigningOut(true);
        try {
            await signOut();
        } finally {
            setSigningOut(false);
        }
        router.push('/');
    };

    const name: string = user?.user_metadata?.name ?? user?.email ?? '';
    const initials = name
        ? name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
        : '?';


    return (
        <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-bold text-gray-900">ReBook</span>
                            <span className="text-[9px] font-semibold text-green-600 tracking-widest uppercase">Sustainable Reads</span>
                        </div>
                    </Link>

                    {/* Nav links */}
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/search" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">
                            Browse Books
                        </Link>
                        <Link href="/listings/create" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">
                            Sell a Book
                        </Link>
                        <Link href="/" className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">
                            Home
                        </Link>
                        {user && isAdmin && (
                            <Link href="/admin" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
                                Admin
                            </Link>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3">
                        {/* Cart button */}
                        <button
                            onClick={() => setCartOpen(true)}
                            aria-label={`Open cart${count > 0 ? `, ${count} items` : ''}`}
                            className="relative p-2 text-gray-500 hover:text-green-600 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {count > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {count > 9 ? '9+' : count}
                                </span>
                            )}
                        </button>

                        {/* Profile */}
                        {!loading && (
                            user ? (
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setDropdownOpen((o) => !o)}
                                        aria-label="Open profile menu"
                                        aria-expanded={dropdownOpen}
                                        className="w-9 h-9 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                                    >
                                        {initials}
                                    </button>

                                    {dropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                                            {/* User info */}
                                            <div className="px-4 py-3 border-b border-gray-100">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                            </div>

                                            <Link
                                                href="/orders"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                </svg>
                                                My Orders
                                            </Link>

                                            <Link
                                                href="/seller"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                </svg>
                                                Seller Dashboard
                                            </Link>

                                            <Link
                                                href="/wishlist"
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                                Wishlist
                                            </Link>

                                            {isAdmin && (
                                                <Link
                                                    href="/admin"
                                                    onClick={() => setDropdownOpen(false)}
                                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                >
                                                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    Admin Panel
                                                </Link>
                                            )}

                                            <div className="border-t border-gray-100 mt-1">
                                                <button
                                                    onClick={handleSignOut}
                                                    disabled={signingOut}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                    </svg>
                                                    {signingOut ? 'Signing out...' : 'Sign Out'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link
                                    href="/auth/signin"
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Sign In
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
