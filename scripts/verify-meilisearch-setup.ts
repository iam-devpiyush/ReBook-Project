import dotenv from 'dotenv';
import { MeiliSearch } from 'meilisearch';

// Load environment variables
dotenv.config({ path: 'backend/.env' });

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || 'http://localhost:7700';
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_API_KEY || '';

async function verifyMeilisearchSetup() {
  console.log('🔍 Verifying Meilisearch Setup...\n');

  try {
    // 1. Check connection
    console.log('1. Testing Meilisearch connection...');
    const client = new MeiliSearch({
      host: MEILISEARCH_HOST,
      apiKey: MEILISEARCH_API_KEY,
    });

    // 2. Check health
    console.log('2. Checking Meilisearch health...');
    const health = await client.health();
    console.log(`   ✅ Status: ${health.status}`);

    // 3. Get version
    console.log('3. Getting Meilisearch version...');
    const version = await client.getVersion();
    console.log(`   ✅ Version: ${version.pkgVersion}`);

    // 4. Check if listings index exists
    console.log('4. Checking listings index...');
    try {
      const index = client.index('listings');
      const stats = await index.getStats();
      console.log(`   ✅ Index exists with ${stats.numberOfDocuments} documents`);
    } catch (error: any) {
      if (error.code === 'index_not_found') {
        console.log('   ⚠️  Index does not exist yet (will be created on first use)');
      } else {
        throw error;
      }
    }

    // 5. Test index creation and configuration
    console.log('5. Testing index configuration...');
    const testIndex = client.index('listings');
    
    // Set searchable attributes
    await testIndex.updateSearchableAttributes([
      'title',
      'author',
      'subject',
      'isbn',
      'publisher',
      'description',
    ]);
    console.log('   ✅ Searchable attributes configured');

    // Set filterable attributes
    await testIndex.updateFilterableAttributes([
      'status',
      'category_id',
      'condition_score',
      'final_price',
      'seller_id',
      'location.city',
      'location.state',
      'location.pincode',
    ]);
    console.log('   ✅ Filterable attributes configured');

    // Set sortable attributes
    await testIndex.updateSortableAttributes([
      'final_price',
      'created_at',
      'condition_score',
    ]);
    console.log('   ✅ Sortable attributes configured');

    // 6. Test document indexing
    console.log('6. Testing document indexing...');
    const testDocument = {
      id: 'test-listing-1',
      book_id: 'test-book-1',
      seller_id: 'test-seller-1',
      title: 'Introduction to Algorithms',
      author: 'Thomas H. Cormen',
      subject: 'Computer Science',
      isbn: '9780262033848',
      publisher: 'MIT Press',
      description: 'A comprehensive textbook on algorithms',
      status: 'active',
      category_id: 'college-cs',
      condition_score: 4,
      final_price: 500,
      original_price: 1000,
      delivery_cost: 50,
      images: ['https://example.com/image1.jpg'],
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const addTask = await testIndex.addDocuments([testDocument], { primaryKey: 'id' });
    await client.waitForTask(addTask.taskUid);
    console.log('   ✅ Test document indexed successfully');

    // 7. Test search
    console.log('7. Testing search functionality...');
    const searchResult = await testIndex.search('algorithms', {
      filter: 'status = "active"',
      limit: 10,
    });
    console.log(`   ✅ Search returned ${searchResult.hits.length} results`);
    console.log(`   ✅ Processing time: ${searchResult.processingTimeMs}ms`);

    // 8. Test typo tolerance
    console.log('8. Testing typo tolerance...');
    const typoResult = await testIndex.search('algoritms', {
      filter: 'status = "active"',
      limit: 10,
    });
    console.log(`   ✅ Typo-tolerant search returned ${typoResult.hits.length} results`);

    // 9. Test filtering
    console.log('9. Testing filtering...');
    const filterResult = await testIndex.search('', {
      filter: 'status = "active" AND condition_score >= 4',
      limit: 10,
    });
    console.log(`   ✅ Filtered search returned ${filterResult.hits.length} results`);

    // 10. Clean up test document
    console.log('10. Cleaning up test document...');
    const deleteTask = await testIndex.deleteDocument('test-listing-1');
    await client.waitForTask(deleteTask.taskUid);
    console.log('   ✅ Test document removed');

    console.log('\n✅ All Meilisearch checks passed!');
    console.log('\n📋 Configuration Summary:');
    console.log(`   Host: ${MEILISEARCH_HOST}`);
    console.log(`   Version: ${version.pkgVersion}`);
    console.log(`   Index: listings`);
    console.log(`   Status: Ready for use`);

  } catch (error: any) {
    console.error('\n❌ Meilisearch verification failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Make sure Meilisearch is running');
      console.error('   2. Check MEILISEARCH_HOST in backend/.env');
      console.error('   3. Start Meilisearch with: meilisearch --master-key="your-key"');
    }
    
    process.exit(1);
  }
}

verifyMeilisearchSetup();
