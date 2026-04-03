/**
 * Shiprocket API Client
 *
 * Handles JWT authentication with automatic token refresh (token expires every 10 days).
 * All Shiprocket API calls go through this client.
 */

const BASE_URL = process.env.SHIPROCKET_API_URL ?? 'https://apiv2.shiprocket.in/v1/external';

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

// Module-level cache — survives across requests in the same Node.js process
let _tokenCache: TokenCache | null = null;

async function fetchToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) {
    throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set');
  }

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const token: string = data.token;
  if (!token) throw new Error('Shiprocket auth response missing token');

  // Cache for 9 days (token lasts 10 days — refresh 1 day early)
  _tokenCache = { token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return token;
}

async function getToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) {
    return _tokenCache.token;
  }
  return fetchToken();
}

/** Reset token cache (used in tests) */
export function _resetTokenCache(): void {
  _tokenCache = null;
}

/**
 * Make an authenticated request to the Shiprocket API.
 */
export async function shiprocketRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 401) {
    // Token may have expired — force refresh and retry once
    _tokenCache = null;
    const freshToken = await fetchToken();
    const retry = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${freshToken}`,
        ...(options.headers ?? {}),
      },
    });
    if (!retry.ok) {
      const text = await retry.text();
      throw new Error(`Shiprocket API error (${retry.status}): ${text}`);
    }
    return retry.json() as Promise<T>;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shiprocket API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}
