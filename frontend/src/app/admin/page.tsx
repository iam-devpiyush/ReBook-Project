'use client';

/**
 * Admin Dashboard Page
 *
 * Entry point for the admin section. Renders the AdminDashboard component
 * after verifying the user has admin privileges.
 *
 * Requirements: 9.1, 9.12
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <span className="text-sm text-gray-500">{user.email}</span>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <AdminDashboard />
      </main>
    </div>
  );
}
