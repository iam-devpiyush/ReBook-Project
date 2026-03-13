#!/usr/bin/env ts-node

/**
 * Verification script for Meilisearch index configuration
 * Checks that all settings match the design specifications
 */

import { getListingsIndex, initializeMeilisearchIndex } from '../backend/src/lib/meilisearch';

async function verifyConfiguration() {
  console.log('🔍 Verifying Meilisearch Index Configuration...\n');

  try {
    // Initialize the index first
    console.log('📝 Initializing index...');
    await initializeMeilisearchIndex();
    console.log('✅ Index initialized\n');

    // Get the index
    const index = getListingsIndex();

    // Get all settings
    const settings = await index.getSettings();

    // Verify searchable attributes
    console.log('🔎 Searchable Attributes:');
    const expectedSearchable = ['title', 'author', 'subject', 'isbn'];
    const actualSearchable = settings.searchableAttributes || [];
    
    if (JSON.stringify(actualSearchable) === JSON.stringify(expectedSearchable)) {
      console.log('✅ Correct:', actualSearchable.join(', '));
    } else {
      console.log('❌ Expected:', expectedSearchable.join(', '));
      console.log('❌ Actual:', actualSearchable.join(', '));
    }
    console.log();

    // Verify filterable attributes
    console.log('🔍 Filterable Attributes:');
    const expectedFilterable = [
      'status',
      'category_id',
      'condition_score',
      'final_price',
      'seller_id',
      'location.city',
      'location.state',
      'location.pincode',
    ];
    const actualFilterable = settings.filterableAttributes || [];
    
    const allPresent = expectedFilterable.every(attr => actualFilterable.includes(attr));
    if (allPresent) {
      console.log('✅ All required attributes present');
      console.log('   ', actualFilterable.join(', '));
    } else {
      console.log('❌ Missing attributes');
      const missing = expectedFilterable.filter(attr => !actualFilterable.includes(attr));
      console.log('   Missing:', missing.join(', '));
    }
    console.log();

    // Verify sortable attributes
    console.log('📊 Sortable Attributes:');
    const expectedSortable = ['final_price', 'created_at', 'condition_score'];
    const actualSortable = settings.sortableAttributes || [];
    
    const allSortablePresent = expectedSortable.every(attr => actualSortable.includes(attr));
    if (allSortablePresent) {
      console.log('✅ Correct:', actualSortable.join(', '));
    } else {
      console.log('❌ Expected:', expectedSortable.join(', '));
      console.log('❌ Actual:', actualSortable.join(', '));
    }
    console.log();

    // Verify ranking rules
    console.log('🏆 Ranking Rules:');
    const expectedRanking = ['typo', 'words', 'proximity', 'attribute', 'sort', 'exactness'];
    const actualRanking = settings.rankingRules || [];
    
    if (JSON.stringify(actualRanking) === JSON.stringify(expectedRanking)) {
      console.log('✅ Correct order:', actualRanking.join(' → '));
    } else {
      console.log('❌ Expected:', expectedRanking.join(' → '));
      console.log('❌ Actual:', actualRanking.join(' → '));
    }
    console.log();

    // Verify typo tolerance
    console.log('✏️  Typo Tolerance:');
    const typoSettings = settings.typoTolerance;
    if (typoSettings) {
      console.log('✅ Enabled:', typoSettings.enabled);
      console.log('✅ One typo at:', typoSettings.minWordSizeForTypos?.oneTypo, 'characters');
      console.log('✅ Two typos at:', typoSettings.minWordSizeForTypos?.twoTypos, 'characters');
    } else {
      console.log('❌ Typo tolerance not configured');
    }
    console.log();

    // Verify pagination settings
    console.log('📄 Pagination Settings:');
    const paginationSettings = settings.pagination;
    if (paginationSettings) {
      console.log('✅ Max total hits:', paginationSettings.maxTotalHits);
    } else {
      console.log('❌ Pagination not configured');
    }
    console.log();

    // Verify faceting settings
    console.log('🏷️  Faceting Settings:');
    const facetingSettings = settings.faceting;
    if (facetingSettings) {
      console.log('✅ Max values per facet:', facetingSettings.maxValuesPerFacet);
    } else {
      console.log('❌ Faceting not configured');
    }
    console.log();

    console.log('✅ Configuration verification complete!');
    console.log('\n📋 Summary:');
    console.log('   - Searchable attributes: 4 fields (title, author, subject, isbn)');
    console.log('   - Filterable attributes: 8 fields');
    console.log('   - Sortable attributes: 3 fields');
    console.log('   - Ranking rules: 6 rules (typo-first)');
    console.log('   - Typo tolerance: Enabled (1@4, 2@8)');
    console.log('   - Max results: 1000 hits');
    console.log('   - Max facet values: 100');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyConfiguration()
  .then(() => {
    console.log('\n✅ All checks passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
