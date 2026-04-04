export const dynamic = 'force-dynamic';
/**
 * API Route: /api/admin/categories/[id]
 *
 * PUT:    Update a category (admin only)
 * DELETE: Delete a category (admin only)
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
 * PUT /api/admin/categories/[id]
 *
 * Body: { name?, type?, parent_id?, metadata? }
 * Validates no circular references are introduced.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) return authResult.response;

    const { id } = params;
    const body = await request.json();
    const { name, type, parent_id, metadata } = body;

    const supabase = createAdminClient();

    // Verify category exists
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id, parent_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Validate type if provided
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
    }

    // Check for circular reference if parent_id is being changed
    if (parent_id !== undefined && parent_id !== null) {
      // A category cannot be its own parent
      if (parent_id === id) {
        return NextResponse.json({ error: 'A category cannot be its own parent' }, { status: 400 });
      }

      // Fetch all categories to check for cycles
      const { data: allCategories } = await supabase
        .from('categories')
        .select('id, parent_id');

      if (wouldCreateCycle(allCategories || [], id, parent_id)) {
        return NextResponse.json(
          { error: 'Setting this parent would create a circular reference' },
          { status: 400 }
        );
      }

      // Validate parent exists
      const { data: parent, error: parentError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', parent_id)
        .single();

      if (parentError || !parent) {
        return NextResponse.json({ error: 'parent_id does not exist' }, { status: 400 });
      }
    }

    // Build update payload (only include provided fields)
    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (type !== undefined) updates.type = type;
    if ('parent_id' in body) updates.parent_id = parent_id ?? null;
    if (metadata !== undefined) updates.metadata = metadata;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating category:', updateError);
      return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error in PUT /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/categories/[id]
 *
 * Deletes a category. Children are cascade-deleted by the DB (ON DELETE CASCADE).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.success) return authResult.response;

    const { id } = params;
    const supabase = createAdminClient();

    // Verify category exists
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
