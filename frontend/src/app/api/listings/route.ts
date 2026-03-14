/**
 * API Route: /api/listings
 * POST: Create a new listing with admin approval required
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth/middleware';
import { createListingSchema } from '@/lib/validation/listing';
import type { CreateListingRequest } from '@/types/listing';
import { applyRateLimit, LISTING_CREATION_RATE_LIMIT } from '@/lib/rate-limit';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) return authResult.response;
    const { user } = authResult;

    const rateLimitResponse = applyRateLimit(request, `listing-create:${user.id}`, LISTING_CREATION_RATE_LIMIT);
    if (rateLimitResponse) return rateLimitResponse;

    const body: CreateListingRequest = await request.json();
    const validationResult = createListingSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;
    const adminSupabase = createAdminClient();

    // 1. Upload data: URL images to Storage
    const finalImages: string[] = [];
    for (let i = 0; i < validatedData.images.length; i++) {
      const img = validatedData.images[i];
      if (img.startsWith('data:')) {
        try {
          await adminSupabase.storage.createBucket('book-images', { public: true }).catch(() => {});
          const [meta, base64] = img.split(',');
          const mime = (meta.match(/data:([^;]+);/) || [])[1] || 'image/jpeg';
          const ext = mime.split('/')[1] || 'jpg';
          const filePath = `listings/${user.id}/${Date.now()}_${i}.${ext}`;
          const { error: upErr } = await adminSupabase.storage
            .from('book-images')
            .upload(filePath, Buffer.from(base64, 'base64'), { contentType: mime, upsert: true });
          if (!upErr) {
            const { data: pub } = adminSupabase.storage.from('book-images').getPublicUrl(filePath);
            finalImages.push(pub.publicUrl);
          } else {
            finalImages.push('https://placehold.co/400x600?text=Book');
          }
        } catch {
          finalImages.push('https://placehold.co/400x600?text=Book');
        }
      } else {
        finalImages.push(img);
      }
    }
    if (finalImages.length === 0) finalImages.push('https://placehold.co/400x600?text=Book');

    // 2. Resolve category
    let categoryId: string | null = null;
    const rawCategory = validatedData.category_id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCategory);

    if (isUuid) {
      categoryId = rawCategory;
    } else {
      const { data: existingCat } = await adminSupabase
        .from('categories')
        .select('id')
        .ilike('name', rawCategory)
        .maybeSingle();

      if (existingCat) {
        categoryId = existingCat.id;
      } else {
        const { data: newCat } = await adminSupabase
          .from('categories')
          .insert({ name: rawCategory, type: 'general' })
          .select('id')
          .single();
        if (newCat) categoryId = newCat.id;
      }
    }

    // 3. Find or create book
    let bookId = validatedData.book_id ?? null;

    if (!bookId && validatedData.isbn) {
      const { data: existing } = await adminSupabase
        .from('books')
        .select('id')
        .eq('isbn', validatedData.isbn)
        .maybeSingle();
      if (existing) bookId = existing.id;
    }

    if (!bookId) {
      const bookTitle = (validatedData.title && validatedData.title.trim()) ? validatedData.title.trim() : 'Unknown Title';
      const bookAuthor = (validatedData.author && validatedData.author.trim()) ? validatedData.author.trim() : 'Unknown Author';
      const coverImage = finalImages.find(u => u.startsWith('http')) ?? null;

      const { data: newBook, error: bookError } = await adminSupabase
        .from('books')
        .insert({
          isbn: validatedData.isbn || null,
          title: bookTitle,
          author: bookAuthor,
          publisher: validatedData.publisher || null,
          edition: validatedData.edition || null,
          publication_year: validatedData.publication_year || null,
          category_id: categoryId,
          subject: validatedData.subject || null,
          description: validatedData.description || null,
          cover_image: coverImage,
        })
        .select('id')
        .single();

      if (bookError || !newBook) {
        console.error('Book insert error:', JSON.stringify(bookError));
        return NextResponse.json(
          { error: `Failed to create book record: ${bookError?.message ?? 'unknown'} [code: ${bookError?.code ?? ''}, detail: ${bookError?.details ?? ''}]` },
          { status: 500 }
        );
      }
      bookId = newBook.id;
    }

    // 4. Create listing
    const { data: listing, error: listingError } = await adminSupabase
      .from('listings')
      .insert({
        book_id: bookId,
        seller_id: user.id,
        original_price: validatedData.original_price,
        condition_score: validatedData.condition_score,
        condition_details: validatedData.condition_details ?? null,
        final_price: validatedData.final_price,
        delivery_cost: validatedData.delivery_cost,
        platform_commission: validatedData.platform_commission,
        payment_fees: validatedData.payment_fees,
        seller_payout: validatedData.seller_payout,
        status: 'pending_approval',
        images: finalImages,
        city: validatedData.location.city,
        state: validatedData.location.state,
        pincode: validatedData.location.pincode,
        latitude: validatedData.location.latitude ?? null,
        longitude: validatedData.location.longitude ?? null,
      })
      .select('id, status, created_at, book_id, seller_id, final_price, seller_payout')
      .single();

    if (listingError || !listing) {
      console.error('Listing insert error:', JSON.stringify(listingError));
      return NextResponse.json(
        { error: `Failed to create listing: ${listingError?.message ?? 'unknown'} [code: ${listingError?.code ?? ''}, detail: ${listingError?.details ?? ''}]` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data: listing, message: 'Listing submitted for admin approval' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Unhandled error in POST /api/listings:', error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
