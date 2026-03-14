/**
 * Logout and Session Management Examples
 * 
 * This file contains example components demonstrating how to use
 * the logout functionality and handle session expiration.
 * 
 * Requirements Implemented:
 * - Requirement 1.8: Invalidate session token on logout
 * - Requirement 1.9: Handle session expiration gracefully
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuthContext } from './provider';
import { useSignOut } from './hooks';
import { signOut } from './client';

/**
 * Example 1: Basic Logout Button
 * 
 * Simple logout button using the client signOut function
 */
export function BasicLogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Logout
    </button>
  );
}

/**
 * Example 2: Logout Button with Loading State
 * 
 * Uses the useSignOut hook for loading state and error handling
 */
export function LogoutButtonWithLoading() {
  const { signOut, signingOut, error } = useSignOut();

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => signOut()}
        disabled={signingOut}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {signingOut ? 'Signing out...' : 'Logout'}
      </button>
      {error && (
        <p className="text-red-600 text-sm">{error.message}</p>
      )}
    </div>
  );
}

/**
 * Example 3: Logout Button with Custom Redirect
 * 
 * Redirects to a custom page after logout
 */
export function LogoutButtonWithRedirect() {
  const { signOut, signingOut } = useSignOut();

  const handleLogout = async () => {
    await signOut('/auth/signin?message=logged_out');
  };

  return (
    <button
      onClick={handleLogout}
      disabled={signingOut}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      {signingOut ? 'Signing out...' : 'Logout'}
    </button>
  );
}

/**
 * Example 4: Logout Button from Context
 * 
 * Uses the AuthProvider context for logout
 */
export function LogoutButtonFromContext() {
  const { signOut, user } = useAuthContext();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      {loading ? 'Signing out...' : 'Logout'}
    </button>
  );
}

/**
 * Example 5: Session Expiration Alert
 * 
 * Displays an alert when the session has expired
 */
export function SessionExpirationAlert() {
  const { error } = useAuthContext();

  if (!error?.message.includes('expired')) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded shadow-lg">
      <div className="flex items-center gap-2">
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <div>
          <p className="font-semibold">Session Expired</p>
          <p className="text-sm">
            Your session has expired. Please{' '}
            <a href="/auth/signin" className="underline font-semibold">
              sign in again
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 6: Session Timer Display
 * 
 * Shows remaining time until session expires
 */
export function SessionTimer() {
  const { session } = useAuthContext();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!session?.expires_at) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const seconds = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
      setTimeRemaining(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (!session) {
    return null;
  }

  const days = Math.floor(timeRemaining / 86400);
  const hours = Math.floor((timeRemaining % 86400) / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = Math.floor(timeRemaining % 60);

  // Show warning when less than 5 minutes remain
  const isWarning = timeRemaining < 300;

  return (
    <div
      className={`text-sm ${
        isWarning ? 'text-yellow-600 font-semibold' : 'text-gray-600'
      }`}
    >
      Session expires in:{' '}
      {days > 0 && `${days}d `}
      {hours > 0 && `${hours}h `}
      {minutes}m {seconds}s
    </div>
  );
}

/**
 * Example 7: User Menu with Logout
 * 
 * Complete user menu component with logout functionality
 */
export function UserMenu() {
  const { user, signOut } = useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100"
      >
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
          {user.email?.[0].toUpperCase()}
        </div>
        <span className="text-sm font-medium">{user.email}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
          <a
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Profile
          </a>
          <a
            href="/settings"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </a>
          <hr className="my-1" />
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
          >
            {loading ? 'Signing out...' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Example 8: Session Status Indicator
 * 
 * Visual indicator of session status
 */
export function SessionStatusIndicator() {
  const { session, error } = useAuthContext();
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!session?.expires_at) return;

    const interval = setInterval(() => {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const seconds = Math.max(0, (expiresAt.getTime() - now.getTime()) / 1000);
      setTimeRemaining(seconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  if (error?.message.includes('expired')) {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
        <span className="text-sm">Session Expired</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
        <span className="text-sm">Not Authenticated</span>
      </div>
    );
  }

  const isWarning = timeRemaining < 300; // Less than 5 minutes

  return (
    <div
      className={`flex items-center gap-2 ${
        isWarning ? 'text-yellow-600' : 'text-green-600'
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isWarning ? 'bg-yellow-600' : 'bg-green-600'
        }`}
      ></div>
      <span className="text-sm">
        {isWarning ? 'Session Expiring Soon' : 'Session Active'}
      </span>
    </div>
  );
}

/**
 * Example 9: Logout Confirmation Dialog
 * 
 * Shows a confirmation dialog before logging out
 */
export function LogoutWithConfirmation() {
  const { signOut } = useAuthContext();
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Logout
      </button>

      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to logout? You will need to sign in again to access your account.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDialog(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Signing out...' : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Example 10: Complete Header with Session Management
 * 
 * Full header component with user menu, session timer, and logout
 */
export function HeaderWithSessionManagement() {
  const { user, session } = useAuthContext();

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">Book Marketplace</h1>
          </div>

          <div className="flex items-center gap-4">
            {user && session && (
              <>
                <SessionStatusIndicator />
                <SessionTimer />
                <UserMenu />
              </>
            )}
            {!user && (
              <a
                href="/auth/signin"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>

      <SessionExpirationAlert />
    </header>
  );
}
