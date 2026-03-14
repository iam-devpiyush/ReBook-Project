import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-gray-300 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                                </svg>
                            </div>
                            <span className="text-white font-bold text-lg">ReBook</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Give books a second life. Buy and sell second-hand books sustainably.
                        </p>
                    </div>

                    {/* Explore */}
                    <div>
                        <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Explore</h3>
                        <ul className="space-y-2">
                            <li><Link href="/search" className="text-sm text-gray-400 hover:text-white transition-colors">Browse Books</Link></li>
                            <li><Link href="/listings/create" className="text-sm text-gray-400 hover:text-white transition-colors">Sell a Book</Link></li>
                        </ul>
                    </div>

                    {/* Account */}
                    <div>
                        <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wider">Account</h3>
                        <ul className="space-y-2">
                            <li><Link href="/orders" className="text-sm text-gray-400 hover:text-white transition-colors">My Orders</Link></li>
                            <li><Link href="/seller" className="text-sm text-gray-400 hover:text-white transition-colors">Seller Dashboard</Link></li>
                            <li><Link href="/wishlist" className="text-sm text-gray-400 hover:text-white transition-colors">Wishlist</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-xs text-gray-500">© {new Date().getFullYear()} ReBook. All rights reserved.</p>
                    <p className="text-xs text-gray-500">Built for a sustainable future 🌱</p>
                </div>
            </div>
        </footer>
    );
}
