/**
 * Supabase query projections
 *
 * Pre-defined select strings that fetch only the fields needed for each
 * view, avoiding over-fetching large JSONB columns or unused fields.
 *
 * Requirements: 22.1-22.6
 */

/** Minimal listing fields for search result cards */
export const LISTING_CARD_PROJECTION = `
  id, book_id, seller_id, condition_score, final_price, status,
  images, city, state, created_at,
  book:books(id, title, author, isbn, cover_image, category_id)
` as const;

/** Full listing detail (book detail page) */
export const LISTING_DETAIL_PROJECTION = `
  *,
  book:books(*),
  seller:users(id, name, email, profile_picture, rating)
` as const;

/** Seller portal listing row */
export const SELLER_LISTING_PROJECTION = `
  id, book_id, status, condition_score, final_price, views, created_at, updated_at,
  rejection_reason, images,
  book:books(id, title, author, isbn, cover_image)
` as const;

/** Order summary for buyer/seller list views */
export const ORDER_SUMMARY_PROJECTION = `
  id, listing_id, buyer_id, seller_id, book_id, price, delivery_cost,
  platform_commission, payment_fees, seller_payout,
  status, payment_status, tracking_id, created_at, paid_at, shipped_at, delivered_at,
  listing:listings(id, images, book:books(id, title, author, isbn, cover_image))
` as const;

/** Admin pending listing row */
export const ADMIN_LISTING_PROJECTION = `
  id, book_id, seller_id, condition_score, final_price, status, images,
  city, state, created_at,
  book:books(id, title, author, isbn, cover_image, category_id),
  seller:users(id, name, email, profile_picture)
` as const;
