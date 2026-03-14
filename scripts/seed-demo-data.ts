/**
 * Demo Data Seed Script
 * Creates demo users, books, listings, orders, and admin account for testing.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/seed-demo-data.ts
 *
 * Requirements: SUPABASE_SERVICE_ROLE_KEY must be set in frontend/.env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from frontend/.env.local
dotenv.config({ path: path.resolve(__dirname, '../frontend/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Use service role to bypass RLS for seeding
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function conditionMultiplier(score: number): number {
    const map: Record<number, number> = { 5: 0.8, 4: 0.7, 3: 0.6, 2: 0.4, 1: 0.25 };
    return map[score] ?? 0.6;
}

function calcPricing(originalPrice: number, conditionScore: number, deliveryCost: number) {
    const basePrice = Math.round(originalPrice * conditionMultiplier(conditionScore));
    const platformCommission = Math.round(basePrice * 0.1);
    const paymentFees = Math.round(basePrice * 0.025 + 3);
    const finalPrice = basePrice + deliveryCost + platformCommission + paymentFees;
    const sellerPayout = basePrice - platformCommission;
    return { basePrice, platformCommission, paymentFees, finalPrice, sellerPayout };
}

// ---------------------------------------------------------------------------
// Static demo data
// ---------------------------------------------------------------------------

const INDIAN_LOCATIONS = [
    { city: 'Mumbai', state: 'Maharashtra', pincode: '400001', latitude: 19.076, longitude: 72.8777 },
    { city: 'Delhi', state: 'Delhi', pincode: '110001', latitude: 28.6139, longitude: 77.209 },
    { city: 'Bangalore', state: 'Karnataka', pincode: '560001', latitude: 12.9716, longitude: 77.5946 },
    { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', latitude: 13.0827, longitude: 80.2707 },
    { city: 'Hyderabad', state: 'Telangana', pincode: '500001', latitude: 17.385, longitude: 78.4867 },
    { city: 'Kolkata', state: 'West Bengal', pincode: '700001', latitude: 22.5726, longitude: 88.3639 },
    { city: 'Pune', state: 'Maharashtra', pincode: '411001', latitude: 18.5204, longitude: 73.8567 },
    { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', latitude: 23.0225, longitude: 72.5714 },
    { city: 'Jaipur', state: 'Rajasthan', pincode: '302001', latitude: 26.9124, longitude: 75.7873 },
    { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', latitude: 26.8467, longitude: 80.9462 },
];

// Category IDs from the existing seed
const CATEGORY_IDS = {
    cbse_9_10: '00000000-0000-0000-0000-000000000113',
    cbse_11_12_science: '00000000-0000-0000-0000-000000000114',
    cbse_11_12_commerce: '00000000-0000-0000-0000-000000000115',
    jee_main: '00000000-0000-0000-0000-000000000021',
    jee_advanced: '00000000-0000-0000-0000-000000000022',
    neet: '00000000-0000-0000-0000-000000000023',
    upsc: '00000000-0000-0000-0000-000000000025',
    cs_engineering: '00000000-0000-0000-0000-000000000311',
    mechanical: '00000000-0000-0000-0000-000000000312',
    commerce_college: '00000000-0000-0000-0000-000000000033',
    fiction: '00000000-0000-0000-0000-000000000041',
    non_fiction: '00000000-0000-0000-0000-000000000042',
    self_help: '00000000-0000-0000-0000-000000000043',
};

// Placeholder image URLs (publicly accessible book cover placeholders)
const PLACEHOLDER_IMAGES = [
    'https://via.placeholder.com/400x600/4F46E5/FFFFFF?text=Book+Cover',
    'https://via.placeholder.com/400x600/7C3AED/FFFFFF?text=Textbook',
    'https://via.placeholder.com/400x600/059669/FFFFFF?text=Academic+Book',
    'https://via.placeholder.com/400x600/DC2626/FFFFFF?text=Study+Guide',
    'https://via.placeholder.com/400x600/D97706/FFFFFF?text=Reference+Book',
    'https://via.placeholder.com/400x600/0891B2/FFFFFF?text=Novel',
    'https://via.placeholder.com/400x600/BE185D/FFFFFF?text=Exam+Prep',
    'https://via.placeholder.com/400x600/1D4ED8/FFFFFF?text=Engineering',
];

// ---------------------------------------------------------------------------
// Demo books data (50+ entries)
// ---------------------------------------------------------------------------

const DEMO_BOOKS = [
    // CBSE 9-10
    { isbn: '9780000000001', title: 'NCERT Mathematics Class 10', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_9_10, subject: 'Mathematics', description: 'Standard NCERT Mathematics textbook for Class 10 CBSE board.' },
    { isbn: '9780000000002', title: 'NCERT Science Class 10', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_9_10, subject: 'Science', description: 'Standard NCERT Science textbook for Class 10 CBSE board.' },
    { isbn: '9780000000003', title: 'NCERT Social Science Class 10', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_9_10, subject: 'Social Science', description: 'NCERT Social Science for Class 10.' },
    { isbn: '9780000000004', title: 'NCERT English Class 10 - First Flight', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_9_10, subject: 'English', description: 'NCERT English First Flight for Class 10.' },
    { isbn: '9780000000005', title: 'RD Sharma Mathematics Class 10', author: 'R.D. Sharma', publisher: 'Dhanpat Rai', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_9_10, subject: 'Mathematics', description: 'Comprehensive mathematics guide by RD Sharma for Class 10.' },
    // CBSE 11-12 Science
    { isbn: '9780000000006', title: 'NCERT Physics Part 1 Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Physics', description: 'NCERT Physics Part 1 for Class 12.' },
    { isbn: '9780000000007', title: 'NCERT Physics Part 2 Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Physics', description: 'NCERT Physics Part 2 for Class 12.' },
    { isbn: '9780000000008', title: 'NCERT Chemistry Part 1 Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Chemistry', description: 'NCERT Chemistry Part 1 for Class 12.' },
    { isbn: '9780000000009', title: 'NCERT Chemistry Part 2 Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Chemistry', description: 'NCERT Chemistry Part 2 for Class 12.' },
    { isbn: '9780000000010', title: 'NCERT Biology Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Biology', description: 'NCERT Biology for Class 12.' },
    { isbn: '9780000000011', title: 'HC Verma Concepts of Physics Vol 1', author: 'H.C. Verma', publisher: 'Bharati Bhawan', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Physics', description: 'Classic physics reference by HC Verma.' },
    { isbn: '9780000000012', title: 'HC Verma Concepts of Physics Vol 2', author: 'H.C. Verma', publisher: 'Bharati Bhawan', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Physics', description: 'Classic physics reference by HC Verma Vol 2.' },
    // JEE
    { isbn: '9780000000013', title: 'Problems in Physical Chemistry for JEE', author: 'N. Avasthi', publisher: 'Balaji Publications', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.jee_main, subject: 'Chemistry', description: 'Physical chemistry problems for JEE preparation.' },
    { isbn: '9780000000014', title: 'Arihant Mathematics for JEE Main', author: 'Amit M Agarwal', publisher: 'Arihant', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.jee_main, subject: 'Mathematics', description: 'Comprehensive JEE Main mathematics guide.' },
    { isbn: '9780000000015', title: 'DC Pandey Mechanics Part 1', author: 'D.C. Pandey', publisher: 'Arihant', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.jee_advanced, subject: 'Physics', description: 'Mechanics for JEE Advanced by DC Pandey.' },
    { isbn: '9780000000016', title: 'DC Pandey Mechanics Part 2', author: 'D.C. Pandey', publisher: 'Arihant', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.jee_advanced, subject: 'Physics', description: 'Mechanics Part 2 for JEE Advanced.' },
    { isbn: '9780000000017', title: 'Organic Chemistry by Morrison Boyd', author: 'Morrison & Boyd', publisher: 'Pearson', edition: '7th', publication_year: 2021, category_id: CATEGORY_IDS.jee_advanced, subject: 'Chemistry', description: 'Organic chemistry reference for JEE Advanced.' },
    // NEET
    { isbn: '9780000000018', title: 'NCERT Biology Exemplar Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.neet, subject: 'Biology', description: 'NCERT Biology Exemplar for NEET preparation.' },
    { isbn: '9780000000019', title: 'Trueman Biology Vol 1 for NEET', author: 'M.P. Tyagi', publisher: 'Trueman', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.neet, subject: 'Biology', description: 'Trueman Biology for NEET Vol 1.' },
    { isbn: '9780000000020', title: 'Trueman Biology Vol 2 for NEET', author: 'M.P. Tyagi', publisher: 'Trueman', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.neet, subject: 'Biology', description: 'Trueman Biology for NEET Vol 2.' },
    { isbn: '9780000000021', title: 'MTG Objective NCERT at Your Fingertips Biology', author: 'MTG Editorial Board', publisher: 'MTG Learning Media', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.neet, subject: 'Biology', description: 'NCERT-based biology for NEET.' },
    // UPSC
    { isbn: '9780000000022', title: 'Indian Polity by M. Laxmikanth', author: 'M. Laxmikanth', publisher: 'McGraw Hill', edition: '6th', publication_year: 2022, category_id: CATEGORY_IDS.upsc, subject: 'Polity', description: 'Essential polity book for UPSC CSE.' },
    { isbn: '9780000000023', title: 'India\'s Struggle for Independence', author: 'Bipan Chandra', publisher: 'Penguin', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.upsc, subject: 'History', description: 'History reference for UPSC.' },
    { isbn: '9780000000024', title: 'Certificate Physical and Human Geography', author: 'Goh Cheng Leong', publisher: 'Oxford', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.upsc, subject: 'Geography', description: 'Geography for UPSC preparation.' },
    { isbn: '9780000000025', title: 'Economic Survey 2022-23', author: 'Ministry of Finance', publisher: 'Government of India', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.upsc, subject: 'Economics', description: 'Annual Economic Survey for UPSC.' },
    // CS Engineering
    { isbn: '9780000000026', title: 'Introduction to Algorithms (CLRS)', author: 'Cormen, Leiserson, Rivest, Stein', publisher: 'MIT Press', edition: '4th', publication_year: 2022, category_id: CATEGORY_IDS.cs_engineering, subject: 'Algorithms', description: 'The definitive algorithms textbook.' },
    { isbn: '9780000000027', title: 'Operating System Concepts', author: 'Silberschatz, Galvin, Gagne', publisher: 'Wiley', edition: '10th', publication_year: 2021, category_id: CATEGORY_IDS.cs_engineering, subject: 'Operating Systems', description: 'OS concepts by Silberschatz.' },
    { isbn: '9780000000028', title: 'Database System Concepts', author: 'Silberschatz, Korth, Sudarshan', publisher: 'McGraw Hill', edition: '7th', publication_year: 2020, category_id: CATEGORY_IDS.cs_engineering, subject: 'Databases', description: 'Database systems textbook.' },
    { isbn: '9780000000029', title: 'Computer Networks by Tanenbaum', author: 'Andrew S. Tanenbaum', publisher: 'Pearson', edition: '5th', publication_year: 2021, category_id: CATEGORY_IDS.cs_engineering, subject: 'Networks', description: 'Computer networks by Tanenbaum.' },
    { isbn: '9780000000030', title: 'Design Patterns: Elements of Reusable OO Software', author: 'Gang of Four', publisher: 'Addison-Wesley', edition: '1st', publication_year: 1994, category_id: CATEGORY_IDS.cs_engineering, subject: 'Software Engineering', description: 'Classic design patterns book.' },
    // Mechanical Engineering
    { isbn: '9780000000031', title: 'Engineering Thermodynamics by P.K. Nag', author: 'P.K. Nag', publisher: 'McGraw Hill', edition: '6th', publication_year: 2022, category_id: CATEGORY_IDS.mechanical, subject: 'Thermodynamics', description: 'Thermodynamics for mechanical engineering.' },
    { isbn: '9780000000032', title: 'Fluid Mechanics by Frank White', author: 'Frank M. White', publisher: 'McGraw Hill', edition: '8th', publication_year: 2021, category_id: CATEGORY_IDS.mechanical, subject: 'Fluid Mechanics', description: 'Fluid mechanics textbook.' },
    // Commerce
    { isbn: '9780000000033', title: 'Financial Accounting by R.L. Gupta', author: 'R.L. Gupta', publisher: 'Sultan Chand', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.commerce_college, subject: 'Accounting', description: 'Financial accounting for B.Com.' },
    { isbn: '9780000000034', title: 'Business Law by Avtar Singh', author: 'Avtar Singh', publisher: 'Eastern Book Company', edition: '2022', publication_year: 2022, category_id: CATEGORY_IDS.commerce_college, subject: 'Business Law', description: 'Business law for commerce students.' },
    { isbn: '9780000000035', title: 'Principles of Management by Koontz', author: 'Harold Koontz', publisher: 'McGraw Hill', edition: '14th', publication_year: 2020, category_id: CATEGORY_IDS.commerce_college, subject: 'Management', description: 'Management principles textbook.' },
    // Fiction
    { isbn: '9780000000036', title: 'The Alchemist', author: 'Paulo Coelho', publisher: 'HarperCollins', edition: '25th Anniversary', publication_year: 2014, category_id: CATEGORY_IDS.fiction, subject: 'Fiction', description: 'International bestseller by Paulo Coelho.' },
    { isbn: '9780000000037', title: 'To Kill a Mockingbird', author: 'Harper Lee', publisher: 'Grand Central Publishing', edition: 'Reprint', publication_year: 2002, category_id: CATEGORY_IDS.fiction, subject: 'Fiction', description: 'Pulitzer Prize winning novel.' },
    { isbn: '9780000000038', title: 'The God of Small Things', author: 'Arundhati Roy', publisher: 'Penguin', edition: '1st', publication_year: 1997, category_id: CATEGORY_IDS.fiction, subject: 'Fiction', description: 'Booker Prize winning Indian novel.' },
    { isbn: '9780000000039', title: 'A Suitable Boy', author: 'Vikram Seth', publisher: 'HarperCollins', edition: '1st', publication_year: 1993, category_id: CATEGORY_IDS.fiction, subject: 'Fiction', description: 'Epic Indian novel by Vikram Seth.' },
    { isbn: '9780000000040', title: 'The White Tiger', author: 'Aravind Adiga', publisher: 'Free Press', edition: '1st', publication_year: 2008, category_id: CATEGORY_IDS.fiction, subject: 'Fiction', description: 'Booker Prize winning novel.' },
    // Non-Fiction
    { isbn: '9780000000041', title: 'Sapiens: A Brief History of Humankind', author: 'Yuval Noah Harari', publisher: 'Harper', edition: '1st', publication_year: 2015, category_id: CATEGORY_IDS.non_fiction, subject: 'History', description: 'Global bestseller on human history.' },
    { isbn: '9780000000042', title: 'Wings of Fire', author: 'A.P.J. Abdul Kalam', publisher: 'Universities Press', edition: '1st', publication_year: 1999, category_id: CATEGORY_IDS.non_fiction, subject: 'Biography', description: 'Autobiography of Dr. APJ Abdul Kalam.' },
    { isbn: '9780000000043', title: 'The Discovery of India', author: 'Jawaharlal Nehru', publisher: 'Penguin', edition: 'Reprint', publication_year: 2004, category_id: CATEGORY_IDS.non_fiction, subject: 'History', description: 'India\'s history by Nehru.' },
    // Self-Help
    { isbn: '9780000000044', title: 'Atomic Habits', author: 'James Clear', publisher: 'Avery', edition: '1st', publication_year: 2018, category_id: CATEGORY_IDS.self_help, subject: 'Self-Help', description: 'Bestselling habits book.' },
    { isbn: '9780000000045', title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey', publisher: 'Free Press', edition: '30th Anniversary', publication_year: 2020, category_id: CATEGORY_IDS.self_help, subject: 'Self-Help', description: 'Classic self-help book.' },
    { isbn: '9780000000046', title: 'Think and Grow Rich', author: 'Napoleon Hill', publisher: 'Tarcher Perigee', edition: 'Revised', publication_year: 2005, category_id: CATEGORY_IDS.self_help, subject: 'Self-Help', description: 'Classic personal finance and motivation book.' },
    // CBSE 11-12 Commerce
    { isbn: '9780000000047', title: 'NCERT Accountancy Part 1 Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_commerce, subject: 'Accountancy', description: 'NCERT Accountancy for Class 12 Commerce.' },
    { isbn: '9780000000048', title: 'NCERT Business Studies Class 12', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_commerce, subject: 'Business Studies', description: 'NCERT Business Studies for Class 12.' },
    { isbn: '9780000000049', title: 'NCERT Economics Class 12 - Macro', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_commerce, subject: 'Economics', description: 'NCERT Macroeconomics for Class 12.' },
    { isbn: '9780000000050', title: 'NCERT Mathematics Class 12 Part 1', author: 'NCERT', publisher: 'NCERT', edition: '2023', publication_year: 2023, category_id: CATEGORY_IDS.cbse_11_12_science, subject: 'Mathematics', description: 'NCERT Mathematics Part 1 for Class 12.' },
];

// ---------------------------------------------------------------------------
// Demo user profiles (inserted into public.users after auth.users creation)
// ---------------------------------------------------------------------------

interface DemoUser {
    email: string;
    name: string;
    role: 'buyer' | 'seller' | 'admin';
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    password: string;
}

const DEMO_USERS: DemoUser[] = [
    // Admin
    { email: 'admin@rebook.demo', name: 'Admin User', role: 'admin', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', latitude: 19.076, longitude: 72.8777, password: 'Demo@1234' },
    // Sellers
    { email: 'seller1@rebook.demo', name: 'Rahul Sharma', role: 'seller', city: 'Delhi', state: 'Delhi', pincode: '110001', latitude: 28.6139, longitude: 77.209, password: 'Demo@1234' },
    { email: 'seller2@rebook.demo', name: 'Priya Patel', role: 'seller', city: 'Bangalore', state: 'Karnataka', pincode: '560001', latitude: 12.9716, longitude: 77.5946, password: 'Demo@1234' },
    { email: 'seller3@rebook.demo', name: 'Amit Kumar', role: 'seller', city: 'Chennai', state: 'Tamil Nadu', pincode: '600001', latitude: 13.0827, longitude: 80.2707, password: 'Demo@1234' },
    { email: 'seller4@rebook.demo', name: 'Sneha Reddy', role: 'seller', city: 'Hyderabad', state: 'Telangana', pincode: '500001', latitude: 17.385, longitude: 78.4867, password: 'Demo@1234' },
    { email: 'seller5@rebook.demo', name: 'Vikram Singh', role: 'seller', city: 'Pune', state: 'Maharashtra', pincode: '411001', latitude: 18.5204, longitude: 73.8567, password: 'Demo@1234' },
    // Buyers
    { email: 'buyer1@rebook.demo', name: 'Ananya Gupta', role: 'buyer', city: 'Kolkata', state: 'West Bengal', pincode: '700001', latitude: 22.5726, longitude: 88.3639, password: 'Demo@1234' },
    { email: 'buyer2@rebook.demo', name: 'Rohan Mehta', role: 'buyer', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', latitude: 23.0225, longitude: 72.5714, password: 'Demo@1234' },
    { email: 'buyer3@rebook.demo', name: 'Kavya Nair', role: 'buyer', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', latitude: 26.9124, longitude: 75.7873, password: 'Demo@1234' },
    { email: 'buyer4@rebook.demo', name: 'Arjun Verma', role: 'buyer', city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001', latitude: 26.8467, longitude: 80.9462, password: 'Demo@1234' },
];

// ---------------------------------------------------------------------------
// Seeding functions
// ---------------------------------------------------------------------------

async function createAuthUser(user: DemoUser): Promise<string | null> {
    const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
    });

    if (error) {
        if (error.message.includes('already been registered') || error.message.includes('already exists')) {
            // Fetch existing user
            const { data: list } = await supabase.auth.admin.listUsers();
            const existing = list?.users?.find((u) => u.email === user.email);
            return existing?.id ?? null;
        }
        console.error(`  Failed to create auth user ${user.email}:`, error.message);
        return null;
    }

    return data.user?.id ?? null;
}

async function upsertPublicUser(id: string, user: DemoUser) {
    const { error } = await supabase.from('users').upsert(
        {
            id,
            oauth_provider: 'google',
            oauth_provider_id: `demo_${id}`,
            email: user.email,
            name: user.name,
            role: user.role,
            city: user.city,
            state: user.state,
            pincode: user.pincode,
            latitude: user.latitude,
            longitude: user.longitude,
            is_active: true,
            rating: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 - 5.0
            total_transactions: randomBetween(0, 20),
        },
        { onConflict: 'id' }
    );

    if (error) console.error(`  Failed to upsert public user ${user.email}:`, error.message);
}

async function seedUsers(): Promise<Record<string, string>> {
    console.log('\n📦 Seeding users...');
    const userMap: Record<string, string> = {}; // email -> id

    for (const user of DEMO_USERS) {
        process.stdout.write(`  Creating ${user.email}... `);
        const id = await createAuthUser(user);
        if (!id) { console.log('SKIPPED'); continue; }
        await upsertPublicUser(id, user);
        userMap[user.email] = id;
        console.log(`OK (${id.slice(0, 8)}...)`);
    }

    return userMap;
}

async function seedBooks(): Promise<Record<string, string>> {
    console.log('\n📚 Seeding books...');
    const bookMap: Record<string, string> = {}; // isbn -> id

    for (const book of DEMO_BOOKS) {
        // Check if book already exists
        const { data: existing } = await supabase
            .from('books')
            .select('id')
            .eq('isbn', book.isbn)
            .single();

        if (existing) {
            bookMap[book.isbn] = existing.id;
            process.stdout.write('.');
            continue;
        }

        const { data, error } = await supabase.from('books').insert(book).select('id').single();
        if (error) {
            console.error(`\n  Failed to insert book "${book.title}":`, error.message);
        } else if (data) {
            bookMap[book.isbn] = data.id;
            process.stdout.write('.');
        }
    }
    console.log(`\n  ✓ ${Object.keys(bookMap).length} books ready`);
    return bookMap;
}

async function seedListings(
    userMap: Record<string, string>,
    bookMap: Record<string, string>
): Promise<string[]> {
    console.log('\n🏷️  Seeding listings...');

    const sellerEmails = ['seller1@rebook.demo', 'seller2@rebook.demo', 'seller3@rebook.demo', 'seller4@rebook.demo', 'seller5@rebook.demo'];
    const bookIsbns = Object.keys(bookMap);
    const listingIds: string[] = [];

    // Check existing listing count
    const { count: existingCount } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true });

    if ((existingCount ?? 0) >= 100) {
        console.log(`  ✓ ${existingCount} listings already exist, skipping`);
        const { data } = await supabase.from('listings').select('id').limit(120);
        return (data ?? []).map((l) => l.id);
    }

    // Create 2-3 listings per book across sellers
    for (let i = 0; i < bookIsbns.length; i++) {
        const isbn = bookIsbns[i];
        const bookId = bookMap[isbn];
        const numListings = randomBetween(2, 3);

        for (let j = 0; j < numListings; j++) {
            const sellerEmail = sellerEmails[(i + j) % sellerEmails.length];
            const sellerId = userMap[sellerEmail];
            if (!sellerId) continue;

            const location = INDIAN_LOCATIONS[(i + j) % INDIAN_LOCATIONS.length];
            const conditionScore = randomBetween(1, 5);
            const originalPrice = randomBetween(150, 1200);
            const deliveryCost = randomBetween(40, 120);
            const { basePrice, platformCommission, paymentFees, finalPrice, sellerPayout } =
                calcPricing(originalPrice, conditionScore, deliveryCost);

            // Vary statuses: mostly active, some pending, some sold
            const statusRoll = Math.random();
            let status: string;
            if (statusRoll < 0.65) status = 'active';
            else if (statusRoll < 0.80) status = 'pending_approval';
            else if (statusRoll < 0.90) status = 'sold';
            else if (statusRoll < 0.95) status = 'rejected';
            else status = 'rescan_required';

            const conditionDetails = {
                cover_damage: randomBetween(1, 5),
                page_quality: randomBetween(1, 5),
                binding_quality: randomBetween(1, 5),
                markings: randomBetween(1, 5),
                discoloration: randomBetween(1, 5),
                notes: conditionScore >= 4 ? 'Excellent condition, barely used' : conditionScore >= 3 ? 'Good condition with minor wear' : 'Shows signs of use',
            };

            const imageUrl = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];

            const { data, error } = await supabase
                .from('listings')
                .insert({
                    book_id: bookId,
                    seller_id: sellerId,
                    original_price: originalPrice,
                    condition_score: conditionScore,
                    condition_details: conditionDetails,
                    suggested_price: basePrice,
                    final_price: finalPrice,
                    delivery_cost: deliveryCost,
                    platform_commission: platformCommission,
                    payment_fees: paymentFees,
                    seller_payout: sellerPayout,
                    status,
                    images: [imageUrl, PLACEHOLDER_IMAGES[(i + 1) % PLACEHOLDER_IMAGES.length]],
                    city: location.city,
                    state: location.state,
                    pincode: location.pincode,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    views: randomBetween(0, 200),
                    ...(status === 'active' && {
                        approved_at: new Date(Date.now() - randomBetween(1, 30) * 86400000).toISOString(),
                        approved_by: userMap['admin@rebook.demo'],
                    }),
                    ...(status === 'rejected' && { rejection_reason: 'Images are unclear. Please upload better quality photos.' }),
                })
                .select('id')
                .single();

            if (error) {
                console.error(`\n  Failed to insert listing:`, error.message);
            } else if (data) {
                listingIds.push(data.id);
                process.stdout.write('.');
            }
        }
    }

    console.log(`\n  ✓ ${listingIds.length} listings created`);
    return listingIds;
}

async function seedOrders(
    userMap: Record<string, string>,
    listingIds: string[]
) {
    console.log('\n🛒 Seeding orders...');

    // Check existing orders
    const { count: existingCount } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

    if ((existingCount ?? 0) >= 20) {
        console.log(`  ✓ ${existingCount} orders already exist, skipping`);
        return;
    }

    const buyerEmails = ['buyer1@rebook.demo', 'buyer2@rebook.demo', 'buyer3@rebook.demo', 'buyer4@rebook.demo'];

    // Fetch active listings — the DB trigger will mark them as 'sold' on order insert
    const { data: activeListings } = await supabase
        .from('listings')
        .select('id, book_id, seller_id, final_price, delivery_cost, platform_commission, payment_fees, seller_payout, city, state, pincode')
        .eq('status', 'active')
        .limit(30);

    if (!activeListings || activeListings.length === 0) {
        console.log('  No active listings found, skipping orders');
        return;
    }

    let created = 0;

    for (const listing of activeListings) {
        const buyerEmail = pick(buyerEmails);
        const buyerId = userMap[buyerEmail];
        if (!buyerId || listing.seller_id === buyerId) continue;

        // Insert with status 'paid' — trigger will set listing to 'sold'
        // Then we update some orders to shipped/delivered/cancelled afterwards
        const buyerLocation = pick(INDIAN_LOCATIONS);
        const now = Date.now();
        const createdAt = new Date(now - randomBetween(1, 60) * 86400000).toISOString();

        const { data: orderData, error } = await supabase.from('orders').insert({
            listing_id: listing.id,
            buyer_id: buyerId,
            seller_id: listing.seller_id,
            book_id: listing.book_id,
            price: listing.final_price ?? 300,
            delivery_cost: listing.delivery_cost ?? 60,
            platform_commission: listing.platform_commission ?? 30,
            payment_fees: listing.payment_fees ?? 10,
            seller_payout: listing.seller_payout ?? 200,
            status: 'paid',
            payment_status: 'completed',
            payment_id: `pay_demo_${Math.random().toString(36).slice(2, 10)}`,
            delivery_address: {
                name: buyerEmail.split('@')[0],
                address_line1: `${randomBetween(1, 999)}, Demo Street`,
                city: buyerLocation.city,
                state: buyerLocation.state,
                pincode: buyerLocation.pincode,
                phone: `98${randomBetween(10000000, 99999999)}`,
            },
            pickup_address: {
                name: listing.seller_id,
                address_line1: `${randomBetween(1, 999)}, Seller Lane`,
                city: listing.city ?? 'Mumbai',
                state: listing.state ?? 'Maharashtra',
                pincode: listing.pincode ?? '400001',
                phone: `97${randomBetween(10000000, 99999999)}`,
            },
            paid_at: new Date(new Date(createdAt).getTime() + 3600000).toISOString(),
        }).select('id').single();

        if (error) {
            if (!error.message.includes('unique') && !error.message.includes('not available')) {
                console.error(`\n  Order insert error:`, error.message);
            }
        } else if (orderData) {
            process.stdout.write('.');
            created++;

            // Vary order statuses: update some to shipped/delivered/cancelled
            const statusRoll = Math.random();
            if (statusRoll < 0.25) {
                // Leave as 'paid'
            } else if (statusRoll < 0.55) {
                await supabase.from('orders').update({
                    status: 'shipped',
                    shipped_at: new Date(new Date(createdAt).getTime() + 86400000).toISOString(),
                }).eq('id', orderData.id);
            } else if (statusRoll < 0.85) {
                await supabase.from('orders').update({
                    status: 'delivered',
                    shipped_at: new Date(new Date(createdAt).getTime() + 86400000).toISOString(),
                    delivered_at: new Date(new Date(createdAt).getTime() + 4 * 86400000).toISOString(),
                }).eq('id', orderData.id);
            } else {
                await supabase.from('orders').update({
                    status: 'cancelled',
                    payment_status: 'refunded',
                    cancelled_at: new Date(new Date(createdAt).getTime() + 7200000).toISOString(),
                }).eq('id', orderData.id);
            }
        }
    }

    console.log(`\n  ✓ ${created} orders created`);
}

async function seedPendingListingsForAdmin(
    userMap: Record<string, string>,
    bookMap: Record<string, string>
) {
    console.log('\n⏳ Ensuring pending listings for admin testing...');

    const { count } = await supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

    if ((count ?? 0) >= 5) {
        console.log(`  ✓ ${count} pending listings already exist`);
        return;
    }

    const sellerId = userMap['seller1@rebook.demo'];
    if (!sellerId) return;

    const pendingBooks = Object.values(bookMap).slice(0, 5);
    let created = 0;

    for (const bookId of pendingBooks) {
        const location = pick(INDIAN_LOCATIONS);
        const conditionScore = randomBetween(3, 5);
        const originalPrice = randomBetween(200, 800);
        const deliveryCost = randomBetween(50, 100);
        const { basePrice, platformCommission, paymentFees, finalPrice, sellerPayout } =
            calcPricing(originalPrice, conditionScore, deliveryCost);

        const { error } = await supabase.from('listings').insert({
            book_id: bookId,
            seller_id: sellerId,
            original_price: originalPrice,
            condition_score: conditionScore,
            condition_details: { cover_damage: 4, page_quality: 4, binding_quality: 5, markings: 5, discoloration: 4 },
            suggested_price: basePrice,
            final_price: finalPrice,
            delivery_cost: deliveryCost,
            platform_commission: platformCommission,
            payment_fees: paymentFees,
            seller_payout: sellerPayout,
            status: 'pending_approval',
            images: [pick(PLACEHOLDER_IMAGES), pick(PLACEHOLDER_IMAGES)],
            city: location.city,
            state: location.state,
            pincode: location.pincode,
            latitude: location.latitude,
            longitude: location.longitude,
            views: 0,
        });

        if (!error) { process.stdout.write('.'); created++; }
    }

    console.log(`\n  ✓ ${created} pending listings created for admin review`);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function main() {
    console.log('🌱 ReBook Demo Data Seeder');
    console.log('==========================');
    console.log(`Supabase URL: ${SUPABASE_URL}`);

    try {
        const userMap = await seedUsers();
        const bookMap = await seedBooks();
        const listingIds = await seedListings(userMap, bookMap);
        await seedOrders(userMap, listingIds);
        await seedPendingListingsForAdmin(userMap, bookMap);

        console.log('\n✅ Demo data seeding complete!');
        console.log('\n📋 Demo Accounts:');
        console.log('  Admin:    admin@rebook.demo    / Demo@1234');
        console.log('  Seller 1: seller1@rebook.demo  / Demo@1234');
        console.log('  Seller 2: seller2@rebook.demo  / Demo@1234');
        console.log('  Seller 3: seller3@rebook.demo  / Demo@1234');
        console.log('  Seller 4: seller4@rebook.demo  / Demo@1234');
        console.log('  Seller 5: seller5@rebook.demo  / Demo@1234');
        console.log('  Buyer 1:  buyer1@rebook.demo   / Demo@1234');
        console.log('  Buyer 2:  buyer2@rebook.demo   / Demo@1234');
        console.log('  Buyer 3:  buyer3@rebook.demo   / Demo@1234');
        console.log('  Buyer 4:  buyer4@rebook.demo   / Demo@1234');
        console.log('\n⚠️  Note: These accounts use email/password auth.');
        console.log('   Enable Email provider in Supabase Auth settings if not already done.');
    } catch (err) {
        console.error('\n❌ Seeding failed:', err);
        process.exit(1);
    }
}

main();
