/**
 * Demo Image Upload Script
 * Generates colored SVG placeholder images and uploads them to Supabase Storage.
 * Associates uploaded image URLs with demo listings.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/upload-demo-images.ts
 *
 * Requirements: SUPABASE_SERVICE_ROLE_KEY must be set in frontend/.env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKET = 'book-images';

// Book cover color themes
const COVER_THEMES = [
    { bg: '#4F46E5', text: '#FFFFFF', label: 'Textbook' },
    { bg: '#7C3AED', text: '#FFFFFF', label: 'Reference' },
    { bg: '#059669', text: '#FFFFFF', label: 'Science' },
    { bg: '#DC2626', text: '#FFFFFF', label: 'Exam Prep' },
    { bg: '#D97706', text: '#FFFFFF', label: 'Mathematics' },
    { bg: '#0891B2', text: '#FFFFFF', label: 'Literature' },
    { bg: '#BE185D', text: '#FFFFFF', label: 'History' },
    { bg: '#1D4ED8', text: '#FFFFFF', label: 'Engineering' },
    { bg: '#065F46', text: '#FFFFFF', label: 'Biology' },
    { bg: '#92400E', text: '#FFFFFF', label: 'Commerce' },
];

/**
 * Generate a simple SVG book cover as a Buffer
 */
function generateBookCoverSVG(title: string, author: string, theme: typeof COVER_THEMES[0]): Buffer {
    // Truncate long titles/authors for display
    const displayTitle = title.length > 22 ? title.slice(0, 20) + '…' : title;
    const displayAuthor = author.length > 25 ? author.slice(0, 23) + '…' : author;

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="400" height="600" fill="${theme.bg}"/>
  <!-- Spine accent -->
  <rect x="0" y="0" width="20" height="600" fill="rgba(0,0,0,0.2)"/>
  <!-- Top band -->
  <rect x="20" y="0" width="380" height="80" fill="rgba(255,255,255,0.15)"/>
  <!-- Category label -->
  <text x="210" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold"
        fill="${theme.text}" text-anchor="middle" opacity="0.9">${theme.label}</text>
  <!-- Decorative lines -->
  <line x1="40" y1="100" x2="360" y2="100" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <line x1="40" y1="480" x2="360" y2="480" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
  <!-- Book icon -->
  <rect x="160" y="140" width="80" height="100" rx="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
  <line x1="175" y1="140" x2="175" y2="240" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
  <line x1="185" y1="155" x2="225" y2="155" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <line x1="185" y1="168" x2="225" y2="168" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <line x1="185" y1="181" x2="225" y2="181" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <line x1="185" y1="194" x2="215" y2="194" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
  <!-- Title -->
  <text x="200" y="290" font-family="Arial, sans-serif" font-size="20" font-weight="bold"
        fill="${theme.text}" text-anchor="middle">${displayTitle}</text>
  <!-- Author -->
  <text x="200" y="330" font-family="Arial, sans-serif" font-size="15"
        fill="${theme.text}" text-anchor="middle" opacity="0.85">${displayAuthor}</text>
  <!-- ReBook watermark -->
  <text x="200" y="560" font-family="Arial, sans-serif" font-size="13"
        fill="${theme.text}" text-anchor="middle" opacity="0.5">ReBook Demo</text>
</svg>`;

    return Buffer.from(svg, 'utf-8');
}

async function ensureBucketExists() {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === BUCKET);
    if (!exists) {
        const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
        if (error) throw new Error(`Failed to create bucket: ${error.message}`);
        console.log(`  ✓ Created bucket: ${BUCKET}`);
    } else {
        console.log(`  ✓ Bucket exists: ${BUCKET}`);
    }
}

async function uploadCoverImage(
    filename: string,
    svgBuffer: Buffer
): Promise<string | null> {
    const filePath = `demo/${filename}`;

    // Check if already uploaded
    const { data: existing } = await supabase.storage.from(BUCKET).list('demo', {
        search: filename,
    });

    if (existing && existing.length > 0) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        return data.publicUrl;
    }

    const { error } = await supabase.storage.from(BUCKET).upload(filePath, svgBuffer, {
        contentType: 'image/svg+xml',
        upsert: true,
    });

    if (error) {
        console.error(`  Upload failed for ${filename}:`, error.message);
        return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
}

async function main() {
    console.log('🖼️  Demo Image Uploader');
    console.log('=======================');

    await ensureBucketExists();

    // Fetch all listings to get book info for cover generation
    console.log('\n📚 Fetching listings with book data...');
    const { data: listings, error: listErr } = await supabase
        .from('listings')
        .select('id, images, books(title, author)')
        .limit(200);

    if (listErr || !listings) {
        console.error('Failed to fetch listings:', listErr?.message);
        process.exit(1);
    }

    console.log(`  Found ${listings.length} listings`);
    console.log('\n⬆️  Uploading cover images...');

    let uploaded = 0;
    let updated = 0;

    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        const book = (listing as any).books as { title: string; author: string } | null;
        if (!book) continue;

        const theme = COVER_THEMES[i % COVER_THEMES.length];
        const svgBuffer = generateBookCoverSVG(book.title, book.author, theme);
        const filename = `cover_${listing.id}.svg`;

        const url = await uploadCoverImage(filename, svgBuffer);
        if (!url) continue;
        uploaded++;

        // Update listing images with the real storage URL
        const { error: updateErr } = await supabase
            .from('listings')
            .update({ images: [url] })
            .eq('id', listing.id);

        if (!updateErr) {
            updated++;
            process.stdout.write('.');
        }
    }

    console.log(`\n  ✓ ${uploaded} images uploaded, ${updated} listings updated`);
    console.log('\n✅ Demo image upload complete!');
}

main().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
