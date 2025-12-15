#!/usr/bin/env node

/**
 * Supabase Verification Script
 * 
 * This script verifies that all Supabase services are running and healthy.
 * It checks:
 * - Container status
 * - Service health endpoints
 * - Database connectivity
 * - API endpoints
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import http from 'http';
import net from 'net';

const execAsync = promisify(exec);

const services = [
  { name: 'Database', port: 54325, type: 'postgres' },
  { name: 'Kong API', port: 8000, type: 'http', path: '/' },
  { name: 'Studio', port: 3001, type: 'http', path: '/' },
  { name: 'PostgREST', port: 3002, type: 'http', path: '/' },
  { name: 'Auth', port: 3003, type: 'http', path: '/health' },
  { name: 'Meta', port: 3004, type: 'http', path: '/health' },
  { name: 'Storage', port: 3005, type: 'http', path: '/status' },
  { name: 'Realtime', port: 3007, type: 'http', path: '/api/health' },
];

async function checkContainer(containerName) {
  try {
    const { stdout } = await execAsync(`docker ps --filter "name=${containerName}" --format "{{.Status}}"`);
    return stdout.trim();
  } catch (error) {
    return null;
  }
}

async function checkHttpService(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${path}`, { timeout: 2000 }, (res) => {
      resolve(res.statusCode < 500);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function checkPostgres(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 2000;
    
    socket.setTimeout(timeout);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => {
      resolve(false);
    });
    
    socket.connect(port, 'localhost');
  });
}

async function main() {
  console.log('🔍 Verifying Supabase services...\n');
  
  // Check Docker
  try {
    await execAsync('docker ps', { timeout: 5000 });
  } catch (error) {
    console.error('❌ Docker is not running or not available.');
    process.exit(1);
  }
  
  // Check containers
  console.log('Checking containers...');
  const containers = [
    'supabase-db',
    'supabase-kong',
    'supabase-studio',
    'supabase-rest',
    'supabase-auth',
    'supabase-meta',
    'supabase-storage',
    'supabase-realtime',
    'supabase-imgproxy',
  ];
  
  let allContainersRunning = true;
  for (const container of containers) {
    const status = await checkContainer(container);
    if (status) {
      console.log(`  ✓ ${container}: ${status.split(' ')[0]}`);
    } else {
      console.log(`  ❌ ${container}: Not running`);
      allContainersRunning = false;
    }
  }
  
  if (!allContainersRunning) {
    console.log('\n⚠️  Some containers are not running.');
    console.log('   Run: npm run supabase:start');
    process.exit(1);
  }
  
  console.log('\nChecking service health...');
  let allHealthy = true;
  
  for (const service of services) {
    let isHealthy = false;
    
    if (service.type === 'postgres') {
      isHealthy = await checkPostgres(service.port);
    } else if (service.type === 'http') {
      isHealthy = await checkHttpService(service.port, service.path);
    }
    
    if (isHealthy) {
      console.log(`  ✓ ${service.name} (port ${service.port}): Healthy`);
    } else {
      console.log(`  ❌ ${service.name} (port ${service.port}): Unhealthy or not responding`);
      allHealthy = false;
    }
  }
  
  console.log('');
  if (allHealthy) {
    console.log('✅ All Supabase services are running and healthy!\n');
    console.log('Access points:');
    console.log('  - Studio: http://localhost:3001');
    console.log('  - API: http://localhost:8000');
    console.log('  - Database: localhost:54325');
  } else {
    console.log('⚠️  Some services are not healthy.');
    console.log('   Wait a few moments and try again, or check logs:');
    console.log('   npm run supabase:logs');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
});

