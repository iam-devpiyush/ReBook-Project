/**
 * API Route: /api/admin/categories
 *
 * POST: Create a new category (admin only)
 *
 * Requirements: 9.10, 14.1-14.9
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { createClient } from '@supabase/supabase-js';
import { wouldCreateCycle } from '@/app/api/categories/route';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const VALID_TYPES = ['school', 'competitive_exam', 'college', 'general'] as const;

/**
 * POST /api/admin/categories
 *
 * Body: { name, type, parent_id?, metadata? }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) return authResult.response;

    const body = await request.json();
    const { name, type, parent_id, metadata } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Validate parent exists if provided
    if (parent_id) {
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parent) {
        return NextResponse.json({ error: 'parent_id does not exist' }, { status: 400 });
      }
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        type,
        parent_id: parent_id || null,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
