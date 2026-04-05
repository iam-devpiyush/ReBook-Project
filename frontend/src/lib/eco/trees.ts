/**
 * Eco impact utilities — trees saved per book based on page count.
 *
 * Formula: 1 tree ≈ 8,333 pages of standard paper
 * (10,000 sheets × 2 pages, adjusted for pulp waste)
 */

const PAGE_COUNT_MAP: Array<[string, number]> = [
  ['NCERT Mathematics Class 10', 320],
  ['NCERT Science Class 10', 294],
  ['NCERT Social Science Class 10', 280],
  ['NCERT English Class 10', 136],
  ['RD Sharma Mathematics Class 10', 1100],
  ['NCERT Physics Part 1 Class 12', 248],
  ['NCERT Physics Part 2 Class 12', 232],
  ['NCERT Chemistry Part 1 Class 12', 256],
  ['NCERT Chemistry Part 2 Class 12', 228],
  ['NCERT Biology Class 12', 380],
  ['HC Verma Concepts of Physics Vol 1', 468],
  ['HC Verma Concepts of Physics Vol 2', 472],
  ['Problems in Physical Chemistry', 1100],
  ['Arihant Mathematics', 1200],
  ['DC Pandey Mechanics Part 1', 520],
  ['DC Pandey Mechanics Part 2', 480],
  ['Organic Chemistry by Morrison Boyd', 1280],
  ['NCERT Biology Exemplar', 260],
  ['Trueman Biology Vol 1', 680],
  ['Trueman Biology Vol 2', 620],
  ['MTG Objective NCERT', 800],
  ['Indian Polity', 700],
  ["India's Struggle for Independence", 582],
  ['Certificate Physical and Human Geography', 420],
  ['Economic Survey', 350],
  ['Introduction to Algorithms', 1292],
  ['Operating System Concepts', 944],
  ['Database System Concepts', 1376],
  ['Computer Networks by Tanenbaum', 960],
  ['Design Patterns', 395],
  ['Engineering Thermodynamics', 868],
  ['Fluid Mechanics by Frank White', 864],
  ['Financial Accounting', 680],
  ['Business Law', 720],
  ['Principles of Management', 648],
  ['The Alchemist', 197],
  ['To Kill a Mockingbird', 281],
  ['The God of Small Things', 340],
  ['A Suitable Boy', 1474],
  ['The White Tiger', 321],
  ['Sapiens', 443],
  ['Wings of Fire', 204],
  ['The Discovery of India', 572],
  ['Atomic Habits', 320],
  ['The 7 Habits', 372],
  ['Think and Grow Rich', 238],
  ['NCERT Accountancy', 260],
  ['NCERT Business Studies', 220],
  ['NCERT Economics', 200],
  ['NCERT Mathematics Class 12', 334],
  ['Linear Algebra', 480],
  ['Engineering Circuit Analysis', 880],
];

export const DEFAULT_PAGES = 300;
export const PAGES_PER_TREE = 8333;

export function estimatePageCount(title: string): number {
  const lower = title.toLowerCase();
  for (const [key, pages] of PAGE_COUNT_MAP) {
    if (lower.includes(key.toLowerCase())) return pages;
  }
  return DEFAULT_PAGES;
}

/** Returns trees saved as a formatted string e.g. "0.024" */
export function treesFromTitle(title: string): string {
  const trees = estimatePageCount(title) / PAGES_PER_TREE;
  return trees < 0.001 ? '< 0.001' : trees.toFixed(3);
}

/** Returns trees saved as a number */
export function treesFromPages(pages: number): number {
  return pages / PAGES_PER_TREE;
}
