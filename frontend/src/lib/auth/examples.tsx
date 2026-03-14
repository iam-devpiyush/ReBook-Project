/**
 * Authentication Utilities - Usage Examples
 * 
 * This file demonstrates how to use the authentication utilities
 * in various scenarios throughout the application.
 */

'use client';

import React from 'react';
import {
  signInWithGoogle,
  signInWithApple,
  signInWithMicrosoft,
  signOut,
  useAuth,
  useIsAuthenticated,
  useUserProfile,
  useIsAdmin,
  useIsSeller,
} from '@/lib/auth';

/**
 * Example 1: Sign In Page with OAuth Buttons
 */
export function SignInPage() {
  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle('/dashboard');
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple('/dashboard');
    } catch (error) {
      console.error('Apple sign in failed:', error);
    }
  };

  const handleMicrosoftSignIn = async () => {
    try {
      await signInWithMicrosoft('/dashboard');
    } catch (error) {
      console.error('Microsoft sign in failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={handleGoogleSignIn} className="btn-oauth">
        Sign in with Google
      </button>
      <button onClick={handleAppleSignIn} className="btn-oauth">
        Sign in with Apple
      </button>
      <button onClick={handleMicrosoftSignIn} className="btn-oauth">
        Sign in with Microsoft
      </button>
    </div>
  );
}

/**
 * Example 2: User Profile Component with Auth State
 */
export function UserProfile() {
  const { user, loading, error } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user) {
    return <div>Not authenticated</div>;
  }

  return (
    <div>
      <h2>Welcome, {user.email}</h2>
      <p>User ID: {user.id}</p>
    </div>
  );
}

/**
 * Example 3: Protected Component with Authentication Check
 */
export function ProtectedContent() {
  const { isAuthenticated, loading } = useIsAuthenticated();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please sign in to view this content</div>;
  }

  return <div>Protected content here</div>;
}

/**
 * Example 4: User Profile with Database Data
 */
export function UserProfileWithData() {
  const { user } = useAuth();
  const { profile, loading, error } = useUserProfile(user?.id);

  if (loading) {
    return <div>Loading profile...</div>;
  }

  if (error) {
    return <div>Error loading profile: {error.message}</div>;
  }

  if (!profile) {
    return <div>No profile found</div>;
  }

  return (
    <div>
      <h2>{profile.name}</h2>
      <p>Email: {profile.email}</p>
      <p>Role: {profile.role}</p>
      <p>Location: {profile.location?.city}</p>
    </div>
  );
}

/**
 * Example 5: Admin-Only Component
 */
export function AdminPanel() {
  const { hasRole: isAdmin, loading } = useIsAdmin();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAdmin) {
    return <div>Access denied. Admin role required.</div>;
  }

  return (
    <div>
      <h2>Admin Panel</h2>
      <p>Admin-only content here</p>
    </div>
  );
}

/**
 * Example 6: Navigation Bar with Sign Out
 */
export function NavigationBar() {
  const { user, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  if (loading) {
    return <nav>Loading...</nav>;
  }

  return (
    <nav>
      {user ? (
        <div>
          <span>{user.email}</span>
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      ) : (
        <a href="/auth/signin">Sign In</a>
      )}
    </nav>
  );
}

/**
 * Example 7: Conditional Rendering Based on Role
 */
export function ConditionalContent() {
  const { hasRole: isAdmin } = useIsAdmin();
  const { hasRole: isSeller } = useIsSeller();

  return (
    <div>
      {isAdmin && <div>Admin content</div>}
      {isSeller && <div>Seller content</div>}
      <div>Public content</div>
    </div>
  );
}

/**
 * Example 8: Real-time Profile Updates
 */
export function RealtimeProfile() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user?.id);

  // Profile automatically updates when database changes
  return (
    <div>
      <h2>{profile?.name}</h2>
      <p>Rating: {profile?.rating}</p>
      <p>Total Transactions: {profile?.total_transactions}</p>
    </div>
  );
}
