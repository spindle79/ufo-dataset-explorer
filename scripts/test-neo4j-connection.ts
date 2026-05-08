/**
 * Test Script: Neo4j Connection
 * Verifies Neo4j connection and basic operations
 */

import { checkNeo4jHealth, getNeo4jSession, shutdownNeo4j } from '../app/lib/neo4j/client';
import { createEntityNode, getGraphStats } from '../app/lib/neo4j/queries';

async function main() {
  console.log('Testing Neo4j connection...\n');

  try {
    // Test 1: Health check
    console.log('Test 1: Health check...');
    const healthy = await checkNeo4jHealth();
    if (!healthy) {
      console.error('❌ Neo4j health check failed');
      process.exit(1);
    }
    console.log('✅ Neo4j is healthy\n');

    // Test 2: Create a test node
    console.log('Test 2: Creating test node...');
    const testId = `test-${Date.now()}`;
    await createEntityNode('Person', testId, 'Test Person', ['Test', 'Person']);
    console.log('✅ Test node created\n');

    // Test 3: Query test node
    console.log('Test 3: Querying test node...');
    const session = await getNeo4jSession();
    try {
      const result = await session.run(
        'MATCH (p:Person {id: $id}) RETURN p',
        { id: testId }
      );

      if (result.records.length > 0) {
        console.log('✅ Test node found:', result.records[0].get('p').properties);
      } else {
        console.error('❌ Test node not found');
      }
    } finally {
      await session.close();
    }
    console.log();

    // Test 4: Get graph stats
    console.log('Test 4: Getting graph statistics...');
    const stats = await getGraphStats();
    console.log('✅ Graph stats:', {
      nodeCounts: stats.nodeCounts,
      relationshipCounts: stats.relationshipCounts,
      mostConnected: stats.mostConnected.length,
    });
    console.log();

    // Test 5: Cleanup test node
    console.log('Test 5: Cleaning up test node...');
    const cleanupSession = await getNeo4jSession();
    try {
      await cleanupSession.run('MATCH (p:Person {id: $id}) DELETE p', { id: testId });
      console.log('✅ Test node deleted\n');
    } finally {
      await cleanupSession.close();
    }

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await shutdownNeo4j();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
