#!/usr/bin/env node

import { createServices } from './build/services/index.js';
import { config } from 'dotenv';

// Load environment variables
config();

async function testEventService() {
  console.log('Testing EventService API integration...\n');
  
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    console.error('EXA_API_KEY environment variable is required');
    process.exit(1);
  }
  
  try {
    // Create services
    const services = createServices(apiKey);
    console.log('✅ Services created successfully');
    
    // Test 1: List Events
    console.log('\n1. Testing listEvents...');
    try {
      const eventsResult = await services.eventService.listEvents({
        limit: 5
      });
      console.log('✅ listEvents successful:');
      console.log(`  - Found ${eventsResult.events?.length || eventsResult.data?.length || 0} events`);
      console.log(`  - Has more: ${eventsResult.hasMore}`);
      console.log(`  - Next cursor: ${eventsResult.nextCursor || 'none'}`);
      
      if (eventsResult.events?.length > 0 || eventsResult.data?.length > 0) {
        const firstEvent = eventsResult.events?.[0] || eventsResult.data?.[0];
        console.log('  - First event:', {
          id: firstEvent.id,
          type: firstEvent.type,
          createdAt: firstEvent.createdAt
        });
      }
    } catch (error) {
      console.error('❌ listEvents failed:', error);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
      }
    }
    
    // Test 2: Get Event (if we have an event ID)
    console.log('\n2. Testing getEvent...');
    try {
      // Try with a test ID
      const testEventId = 'event_test123';
      const eventResult = await services.eventService.getEvent(testEventId);
      console.log('✅ getEvent successful:', eventResult);
    } catch (error) {
      console.error('❌ getEvent failed:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
      }
    }
    
    // Test 3: Test the actual endpoint being called
    console.log('\n3. Testing raw API client...');
    try {
      const apiClient = services.eventService.apiClient;
      console.log('  Base URL:', apiClient.httpClient.defaults.baseURL);
      
      // Try a direct request
      const response = await apiClient.httpClient.get('/events', {
        params: { limit: 5 }
      });
      console.log('✅ Raw request successful:', {
        status: response.status,
        dataKeys: Object.keys(response.data)
      });
    } catch (error) {
      console.error('❌ Raw request failed:', error.message);
      if (error.response) {
        console.error('  Response status:', error.response.status);
        console.error('  Response data:', error.response.data);
        console.error('  Response headers:', error.response.headers);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Run the test
testEventService().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});