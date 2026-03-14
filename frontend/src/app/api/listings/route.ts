/**
 * API Route: /api/listings
 * 
 * POST: Create a new listing with admin approval required
 * 
 * Requirements: 2.1-2.10, 3.1, 3.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { requireSeller } from '@/lib/auth/middleware';
import { createListingSchema } from '@/lib/validation/listing';
import type { CreateListingRequest } from '@/types/listing';

/**
 * POST /api/listings
 * 
 * Create a new book listing
 * - Verifies seller is authenticated
 * - Validates listing data with Zod schema
 * - Creates or finds book record
 * - Creates listing with status "pending_approval"
 * - Returns created listing
 */
export async function POST(request: NextRequest) {
  try {
    // Verify seller is authenticated
    const authResult = await requireSeller(request);
    
    if (!authResult.success) {
      return authResult.response;
    }
    
    const { user } = authResult;
    
    // Parse and validate request body
    const body: CreateListingRequest = await request.json();
    
    const validationResult = createListingSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Create Supabase client
    const supabase = createServerClient();
    
    // Check if seller has reached listing limit
    const { data: sellerProfile, error: profileError } = await supabase
      .from('users')
      .select('listing_limit')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching seller profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to verify seller status' },
        { status: 500 }
      );
    }
    
    // Check listing limit (-1 means unlimited)
    if (sellerProfile.listing_limit !== null && sellerProfile.listing_limit !== -1) {
      const { count, error: countError } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', user.id)
        .in('status', ['pending_approval', 'active']);
      
      if (countError) {
        console.error('Error counting listings:', countError);
        return NextResponse.json(
          { error: 'Failed to verify listing limit' },
          { status: 500 }
        );
      }
      
      if (count !== null && count >= sellerProfile.listing_limit) {
        return NextResponse.json(
          { 
            error: 'Listing limit reached', 
            limit: sellerProfile.listing_limit,
            current: count 
          },
          { status: 403 }
        );
      }
    }
    
    // Find or create book record
    let bookId = validatedData.book_id;
    
    if (!bookId) {
      // Check if book exists by ISBN
      if (validatedData.isbn) {
        const { data: existingBook } = await supabase
          .from('books')
          .select('id')
          .eq('isbn', validatedData.isbn)
          .single();
        
        if (existingBook) {
          bookId = existingBook.id;
        }
      }
      
      // Create new book if not found
      if (!bookId) {
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            isbn: validatedData.isbn || null,
            title: validatedData.title,
            author: validatedData.author,
            publisher: validatedData.publisher || null,
            edition: validatedData.edition || null,
            publication_year: validatedData.publication_year || null,
            category_id: validatedData.category_id,
            subject: validatedData.subject || null,
            description: validatedData.description || null,
            cover_image: validatedData.images[0], // Use first image as cover
          })
          .select('id')
          .single();
        
        if (bookError || !newBook) {
          console.error('Error creating book:', bookError);
          return NextResponse.json(
            { error: 'Failed to create book record' },
            { status: 500 }
          );
        }
        
        bookId = newBook.id;
      }
    }
    
    // Create listing with status "pending_approval"
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .insert({
        book_id: bookId,
        seller_id: user.id,
        original_price: validatedData.original_price,
        condition_score: validatedData.condition_score,
        condition_details: validatedData.condition_details || null,
        final_price: validatedData.final_price,
        delivery_cost: validatedData.delivery_cost,
        platform_commission: validatedData.platform_commission,
        payment_fees: validatedData.payment_fees,
        seller_payout: validatedData.seller_payout,
        status: 'pending_approval',
        images: validatedData.images,
        location: validatedData.location,
      })
      .select(`
        *,
        book:books(*),
        seller:users(id, name, email, profile_picture, rating)
      `)
      .single();
    
    if (listingError || !listing) {
      console.error('Error creating listing:', listingError);
      return NextResponse.json(
        { error: 'Failed to create listing' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: listing,
      message: 'Listing created successfully and submitted for admin approval',
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/listings:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
