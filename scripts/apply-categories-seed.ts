/**
 * Apply category seed data directly via Supabase client.
 * Run this before seed-demo-data.ts if categories are missing.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/apply-categories-seed.ts
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

const CATEGORIES = [
    // Root categories
    { id: '00000000-0000-0000-0000-000000000001', name: 'School Books', type: 'school', parent_id: null, metadata: {} },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Competitive Exams', type: 'competitive_exam', parent_id: null, metadata: {} },
    { id: '00000000-0000-0000-0000-000000000003', name: 'College Textbooks', type: 'college', parent_id: null, metadata: {} },
    { id: '00000000-0000-0000-0000-000000000004', name: 'General Reading', type: 'general', parent_id: null, metadata: {} },
    // School > CBSE
    { id: '00000000-0000-0000-0000-000000000011', name: 'CBSE', type: 'school', parent_id: '00000000-0000-0000-0000-000000000001', metadata: { board: 'CBSE' } },
    { id: '00000000-0000-0000-0000-000000000012', name: 'ICSE', type: 'school', parent_id: '00000000-0000-0000-0000-000000000001', metadata: { board: 'ICSE' } },
    { id: '00000000-0000-0000-0000-000000000013', name: 'State Boards', type: 'school', parent_id: '00000000-0000-0000-0000-000000000001', metadata: { board: 'State' } },
    // CBSE classes
    { id: '00000000-0000-0000-0000-000000000111', name: 'Class 1-5', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '1-5' } },
    { id: '00000000-0000-0000-0000-000000000112', name: 'Class 6-8', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '6-8' } },
    { id: '00000000-0000-0000-0000-000000000113', name: 'Class 9-10', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '9-10' } },
    { id: '00000000-0000-0000-0000-000000000114', name: 'Class 11-12 Science', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '11-12', stream: 'Science' } },
    { id: '00000000-0000-0000-0000-000000000115', name: 'Class 11-12 Commerce', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '11-12', stream: 'Commerce' } },
    { id: '00000000-0000-0000-0000-000000000116', name: 'Class 11-12 Arts', type: 'school', parent_id: '00000000-0000-0000-0000-000000000011', metadata: { board: 'CBSE', class_level: '11-12', stream: 'Arts' } },
    // Competitive exams
    { id: '00000000-0000-0000-0000-000000000021', name: 'JEE Main', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'JEE Main' } },
    { id: '00000000-0000-0000-0000-000000000022', name: 'JEE Advanced', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'JEE Advanced' } },
    { id: '00000000-0000-0000-0000-000000000023', name: 'NEET', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'NEET' } },
    { id: '00000000-0000-0000-0000-000000000024', name: 'AIIMS', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'AIIMS' } },
    { id: '00000000-0000-0000-0000-000000000025', name: 'UPSC', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'UPSC' } },
    { id: '00000000-0000-0000-0000-000000000026', name: 'State PSC', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'State PSC' } },
    { id: '00000000-0000-0000-0000-000000000027', name: 'Banking Exams', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'Banking' } },
    { id: '00000000-0000-0000-0000-000000000028', name: 'SSC', type: 'competitive_exam', parent_id: '00000000-0000-0000-0000-000000000002', metadata: { exam_type: 'SSC' } },
    // College
    { id: '00000000-0000-0000-0000-000000000031', name: 'Engineering', type: 'college', parent_id: '00000000-0000-0000-0000-000000000003', metadata: { stream: 'Engineering' } },
    { id: '00000000-0000-0000-0000-000000000032', name: 'Medical', type: 'college', parent_id: '00000000-0000-0000-0000-000000000003', metadata: { stream: 'Medical' } },
    { id: '00000000-0000-0000-0000-000000000033', name: 'Commerce', type: 'college', parent_id: '00000000-0000-0000-0000-000000000003', metadata: { stream: 'Commerce' } },
    { id: '00000000-0000-0000-0000-000000000034', name: 'Arts & Humanities', type: 'college', parent_id: '00000000-0000-0000-0000-000000000003', metadata: { stream: 'Arts' } },
    { id: '00000000-0000-0000-0000-000000000311', name: 'Computer Science', type: 'college', parent_id: '00000000-0000-0000-0000-000000000031', metadata: { stream: 'Engineering', branch: 'Computer Science' } },
    { id: '00000000-0000-0000-0000-000000000312', name: 'Mechanical', type: 'college', parent_id: '00000000-0000-0000-0000-000000000031', metadata: { stream: 'Engineering', branch: 'Mechanical' } },
    { id: '00000000-0000-0000-0000-000000000313', name: 'Electrical', type: 'college', parent_id: '00000000-0000-0000-0000-000000000031', metadata: { stream: 'Engineering', branch: 'Electrical' } },
    { id: '00000000-0000-0000-0000-000000000314', name: 'Civil', type: 'college', parent_id: '00000000-0000-0000-0000-000000000031', metadata: { stream: 'Engineering', branch: 'Civil' } },
    // General
    { id: '00000000-0000-0000-0000-000000000041', name: 'Fiction', type: 'general', parent_id: '00000000-0000-0000-0000-000000000004', metadata: { genre: 'Fiction' } },
    { id: '00000000-0000-0000-0000-000000000042', name: 'Non-Fiction', type: 'general', parent_id: '00000000-0000-0000-0000-000000000004', metadata: { genre: 'Non-Fiction' } },
    { id: '00000000-0000-0000-0000-000000000043', name: 'Self-Help', type: 'general', parent_id: '00000000-0000-0000-0000-000000000004', metadata: { genre: 'Self-Help' } },
    { id: '00000000-0000-0000-0000-000000000044', name: 'Biography', type: 'general', parent_id: '00000000-0000-0000-0000-000000000004', metadata: { genre: 'Biography' } },
];

async function main() {
    console.log('🗂️  Applying category seed data...');

    // Insert in order: roots first, then children (already ordered above)
    let inserted = 0;
    let skipped = 0;

    for (const cat of CATEGORIES) {
        const { error } = await supabase
            .from('categories')
            .upsert(cat, { onConflict: 'id' });

        if (error) {
            console.error(`  Failed: ${cat.name} — ${error.message}`);
        } else {
            process.stdout.write('.');
            inserted++;
        }
    }

    console.log(`\n  ✓ ${inserted} categories upserted`);
    console.log('\n✅ Category seed complete! Now run: npm run seed:demo');
}

main().catch((err) => {
    console.error('❌ Failed:', err);
    process.exit(1);
});
