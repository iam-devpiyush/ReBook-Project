/**
 * Property Test: Category Hierarchy Validity
 *
 * Property: No circular references can exist in the category hierarchy.
 * A category's ancestor chain must always terminate at a root (parent_id = null).
 *
 * Validates: Requirements 14.7, 14.8
 */

import { describe, it, expect } from 'vitest';
import { wouldCreateCycle } from '../route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FlatCategory = { id: string; parent_id: string | null };

/** Build a linear chain: root → c1 → c2 → ... → cN */
function buildChain(length: number): FlatCategory[] {
  const cats: FlatCategory[] = [{ id: 'root', parent_id: null }];
  for (let i = 1; i < length; i++) {
    cats.push({ id: `c${i}`, parent_id: i === 1 ? 'root' : `c${i - 1}` });
  }
  return cats;
}

/** Build a simple tree: one root with N children */
function buildTree(childCount: number): FlatCategory[] {
  const cats: FlatCategory[] = [{ id: 'root', parent_id: null }];
  for (let i = 0; i < childCount; i++) {
    cats.push({ id: `child-${i}`, parent_id: 'root' });
  }
  return cats;
}

// ---------------------------------------------------------------------------
// Property: wouldCreateCycle correctly detects direct self-reference
// ---------------------------------------------------------------------------
describe('Category Hierarchy Validity', () => {
  it('detects direct self-reference (category set as its own parent)', () => {
    const cats: FlatCategory[] = [{ id: 'a', parent_id: null }];
    expect(wouldCreateCycle(cats, 'a', 'a')).toBe(true);
  });

  it('detects 2-node cycle (a→b, then b→a)', () => {
    const cats: FlatCategory[] = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: 'a' },
    ];
    // Making 'a' a child of 'b' would create a cycle
    expect(wouldCreateCycle(cats, 'a', 'b')).toBe(true);
  });

  it('detects cycle in a chain of 5 nodes', () => {
    const cats = buildChain(5); // root → c1 → c2 → c3 → c4
    // Making root a child of c4 would create a cycle
    expect(wouldCreateCycle(cats, 'root', 'c4')).toBe(true);
  });

  it('detects cycle in a chain of 10 nodes', () => {
    const cats = buildChain(10);
    // Making root a child of c9 would create a cycle
    expect(wouldCreateCycle(cats, 'root', 'c9')).toBe(true);
  });

  it('allows valid parent assignment (no cycle)', () => {
    const cats: FlatCategory[] = [
      { id: 'a', parent_id: null },
      { id: 'b', parent_id: null },
    ];
    // Moving b under a is fine
    expect(wouldCreateCycle(cats, 'b', 'a')).toBe(false);
  });

  it('allows assigning a sibling as parent (no cycle)', () => {
    const cats = buildTree(3); // root with child-0, child-1, child-2
    // Making child-0 a child of child-1 is fine
    expect(wouldCreateCycle(cats, 'child-0', 'child-1')).toBe(false);
  });

  it('allows assigning root as parent of a leaf (no cycle)', () => {
    const cats = buildChain(5);
    // Making c4 a direct child of root is fine (it already is indirectly, but no cycle)
    expect(wouldCreateCycle(cats, 'c4', 'root')).toBe(false);
  });

  it('detects cycle when intermediate ancestor is the target', () => {
    const cats: FlatCategory[] = [
      { id: 'root', parent_id: null },
      { id: 'mid', parent_id: 'root' },
      { id: 'leaf', parent_id: 'mid' },
    ];
    // Making root a child of leaf would create root→mid→leaf→root
    expect(wouldCreateCycle(cats, 'root', 'leaf')).toBe(true);
    // Making mid a child of leaf would create mid→leaf→mid
    expect(wouldCreateCycle(cats, 'mid', 'leaf')).toBe(true);
  });

  it('handles empty category list without throwing', () => {
    expect(() => wouldCreateCycle([], 'a', 'b')).not.toThrow();
    expect(wouldCreateCycle([], 'a', 'b')).toBe(false);
  });

  it('property: for any valid tree, moving a node to a non-descendant never creates a cycle', () => {
    // Build a tree: root → a → b → c
    const cats: FlatCategory[] = [
      { id: 'root', parent_id: null },
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: 'a' },
      { id: 'c', parent_id: 'b' },
      { id: 'x', parent_id: null }, // separate root
    ];
    // Moving 'x' under any node in the other tree is safe
    expect(wouldCreateCycle(cats, 'x', 'root')).toBe(false);
    expect(wouldCreateCycle(cats, 'x', 'a')).toBe(false);
    expect(wouldCreateCycle(cats, 'x', 'b')).toBe(false);
    expect(wouldCreateCycle(cats, 'x', 'c')).toBe(false);
  });

  it('property: moving a node to one of its own descendants always creates a cycle', () => {
    const cats: FlatCategory[] = [
      { id: 'root', parent_id: null },
      { id: 'a', parent_id: 'root' },
      { id: 'b', parent_id: 'a' },
      { id: 'c', parent_id: 'b' },
    ];
    // root's descendants are a, b, c — all should create cycles
    expect(wouldCreateCycle(cats, 'root', 'a')).toBe(true);
    expect(wouldCreateCycle(cats, 'root', 'b')).toBe(true);
    expect(wouldCreateCycle(cats, 'root', 'c')).toBe(true);
  });
});
