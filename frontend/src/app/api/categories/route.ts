/**
 * API Route: /api/categories
 *
 * GET: Fetch all categories (public)
 *
 * Requirements: 9.10, 14.1-14.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { appCache, TTL } from '@/lib/cache';

export interface Category {
  id: string;
  name: string;
  type: 'school' | 'competitive_exam' | 'college' | 'general';
  parent_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

/**
 * Detect circular references in the category hierarchy.
 * Returns true if setting parentId as the parent of categoryId would create a cycle.
 */
export function wouldCreateCycle(
  categories: Array<{ id: string; parent_id: string | null }>,
  categoryId: string,
  newParentId: string
): boolean {
  // Walk up from newParentId; if we reach categoryId, it's a cycle
  const parentMap = new Map(categories.map((c) => [c.id, c.parent_id]));
  let current: string | null = newParentId;
  while (current !== null) {
    if (current === categoryId) return true;
    current = parentMap.get(current) ?? null;
  }
  return false;
}

/**
 * GET /api/categories
 *
 * Returns all categories. Pass ?tree=true to get a nested tree structure.
 */
export async function GET(request: NextRequest) {
  try {
    const tree = request.nextUrl.searchParams.get('tree') === 'true';
    const cacheKey = `categories:${tree ? 'tree' : 'flat'}`;

    // Return cached result if available (TTL: 24 hours — Requirement 22.8)
    const cached = appCache.get<Category[] | { success: boolean; data: Category[] }>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached, cached: true });
    }

    const supabase = createServerClient();

    const { data: categories, error } = await supabase
      .from('categories')
      .select('id, name, type, parent_id, metadata, created_at, updated_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    if (!tree) {
      appCache.set(cacheKey, categories, TTL.CATEGORIES);
      return NextResponse.json({ success: true, data: categories });
    }

    // Build nested tree
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    for (const cat of (categories as Category[])) {
      map.set(cat.id, { ...cat, children: [] });
    }

    for (const cat of map.values()) {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(cat);
      } else {
        roots.push(cat);
      }
    }

    appCache.set(cacheKey, roots, TTL.CATEGORIES);
    return NextResponse.json({ success: true, data: roots });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
