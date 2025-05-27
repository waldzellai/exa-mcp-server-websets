#!/usr/bin/env node

import { createServices } from './build/services/index.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function testCancelSearch() {
  console.log('Testing Cancel Search API integration...\n');
  
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.error('EXA_API_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    // Create services
    const services = createServices(apiKey);
    console.log('✅ Services created successfully');
    
    // First, we need to create a webset and search to cancel
    console.log('\n1. Creating a test webset...');
    const webset = await services.websetService.createWebset({
      search: {
        query: "test search for cancellation",
        count: 5
      },
      metadata: { test: "cancel-search" }
    });
    console.log('✅ Webset created:', webset.id);
    
    // Create a search on this webset
    console.log('\n2. Creating a search on the webset...');
    const search = await services.searchService.createSearch({
      websetId: webset.id,
      query: "additional search query",
      count: 5
    });
    console.log('✅ Search created:', search.id);
    console.log('  Status:', search.status);
    
    // Try to cancel the search
    console.log('\n3. Attempting to cancel the search...');
    try {
      const cancelResult = await services.searchService.cancelSearch(webset.id, search.id);
      console.log('✅ Search cancelled successfully:', {
        id: cancelResult.id,
        status: cancelResult.status,
        canceledAt: cancelResult.canceledAt
      });
    } catch (error) {
      console.error('❌ Cancel search failed:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
      }
      
      // Check if search is already completed
      console.log('\n4. Checking search status...');
      const searchStatus = await services.searchService.getSearch(webset.id, search.id);
      console.log('  Current search status:', searchStatus.status);
      if (searchStatus.status === 'completed' || searchStatus.status === 'canceled') {
        console.log('  ℹ️  Search cannot be cancelled because it already', searchStatus.status);
      }
    }
    
    // Clean up - delete the test webset
    console.log('\n5. Cleaning up test webset...');
    await services.websetService.deleteWebset(webset.id);
    console.log('✅ Test webset deleted');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the test
testCancelSearch().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});