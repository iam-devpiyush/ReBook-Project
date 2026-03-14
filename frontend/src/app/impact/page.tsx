'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EcoStats {
    trees_saved: number;
    water_saved_liters: number;
    co2_reduced_kg: number;
    total_books_sold: number;
}

export default function ImpactPage() {
    const [eco, setEco] = useState<EcoStats | null>(null);

    useEffect(() => {
        fetch('/api/impact')
            .then(r => r.json())
            .then(d => setEco(d.data ?? d))
            .catch(() => { });
    }, []);

    const fmt = (n: number, dp = 2) =>
        n.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp });

    const treesSaved = eco ? fmt(eco.trees_saved) : '0.00';
    const waterSaved = eco ? Math.round(eco.water_saved_liters) : 0;
    const co2Saved = eco ? fmt(eco.co2_reduced_kg, 1) : '0.0';
    const totalBooks = eco?.total_books_sold ?? 0;

    return (
        <div className="bg-white">
            {/* ── Hero ── */}
            <section
                className="relative min-h-[520px] flex items-center"
                style={{
                    backgroundColor: '#f0fdf4',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='2' cy='2' r='1.5' fill='%2316a34a' fill-opacity='0.15'/%3E%3C/svg%3E")`,
                }}
            >
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-20 w-full">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-7 border border-green-200">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Save trees, share stories
                        </div>

                        <h1 className="text-5xl font-extrabold text-gray-900 leading-[1.1] mb-5">
                            Every book deserves{' '}
                            <span className="text-green-600">a second chapter</span>
                        </h1>

                        <p className="text-base text-gray-500 mb-8 leading-relaxed max-w-md">
                            Buy and sell pre-owned books with AI-verified conditions and fair pricing.
                            Better for your wallet, better for the planet.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <Link
                                href="/search"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-sm text-sm"
                            >
                                Browse Books →
                            </Link>
                            <Link
                                href="/listings/create"
                                className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-gray-400 transition-colors text-sm bg-white"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Sell Your Books
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── How ReBook Works ── */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold text-gray-900">How ReBook Works</h2>
                        <p className="text-gray-500 mt-2 text-sm">Three simple steps to give your books a new home</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Step 1</p>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Scan Your Book</h3>
                            <p className="text-sm text-gray-500 leading-relaxed text-center">
                                Take photos with our AI scanner. It evaluates condition and auto-fills book details.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Step 2</p>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Get Fair Pricing</h3>
                            <p className="text-sm text-gray-500 leading-relaxed text-center">
                                Our algorithm calculates the best price based on condition, market data, and more.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                                style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                            </div>
                            <p className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2">Step 3</p>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Ship &amp; Earn</h3>
                            <p className="text-sm text-gray-500 leading-relaxed text-center">
                                Once approved and sold, we handle logistics. You earn your payout seamlessly.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Environmental Impact card ── */}
            <section className="pb-20 bg-white">
                <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
                    <div
                        className="rounded-2xl p-8 relative overflow-hidden"
                        style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)' }}
                    >
                        <div className="absolute right-0 top-0 w-64 h-64 rounded-full bg-white opacity-10 translate-x-24 -translate-y-24 pointer-events-none" />
                        <div className="absolute right-16 bottom-0 w-40 h-40 rounded-full bg-white opacity-10 translate-y-12 pointer-events-none" />

                        <div className="relative">
                            <div className="flex items-center gap-2 mb-6">
                                <svg className="w-4 h-4 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-green-100 text-xs font-semibold tracking-widest uppercase">Environmental Impact</span>
                            </div>

                            <div className="grid grid-cols-3 gap-8">
                                <div>
                                    <p className="text-4xl font-bold text-white">{treesSaved}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                        </svg>
                                        <span className="text-green-200 text-sm">Trees Saved</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-white">{waterSaved}L</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M12 3s-6 5.686-6 10a6 6 0 0012 0c0-4.314-6-10-6-10z" />
                                        </svg>
                                        <span className="text-green-200 text-sm">Water Saved</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-4xl font-bold text-white">{co2Saved}kg</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <svg className="w-3.5 h-3.5 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                                        </svg>
                                        <span className="text-green-200 text-sm">CO₂ Reduced</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-green-200 text-xs mt-5">
                                Based on {totalBooks} book{totalBooks !== 1 ? 's' : ''} reused through our platform
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
