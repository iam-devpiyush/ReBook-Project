/**
 * GET /api/books/cover?isbn=...&title=...&author=...
 * Returns the best available cover image URL for a book.
 */
import { NextRequest, NextResponse } from 'next/server';

function buildCoverUrl(item: any): string | null {
  const links = item?.volumeInfo?.imageLinks;
  const raw = links?.extraLarge || links?.large || links?.medium || links?.thumbnail || links?.smallThumbnail;
  if (raw) return raw.replace('http://', 'https://').replace('zoom=1', 'zoom=3').replace('&edge=curl', '');
  if (item?.id) return `https://books.google.com/books/content?id=${item.id}&printsec=frontcover&img=1&zoom=3&source=gbs_api`;
  return null;
}

async function searchGoogleBooks(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    for (const item of data.items ?? []) {
      const url = buildCoverUrl(item);
      if (url) return url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const isbn = searchParams.get('isbn');
  const title = searchParams.get('title') ?? '';
  const author = searchParams.get('author') ?? '';

  let coverUrl: string | null = null;

  // 1. ISBN exact search
  if (isbn) {
    coverUrl = await searchGoogleBooks(`isbn:${isbn}`);
  }

  // 2. Title + author search (no quotes — more flexible)
  if (!coverUrl && title) {
    coverUrl = await searchGoogleBooks(`${title} ${author}`.trim());
  }

  // 3. Title only
  if (!coverUrl && title) {
    coverUrl = await searchGoogleBooks(title);
  }

  return NextResponse.json({ cover_url: coverUrl });
}
