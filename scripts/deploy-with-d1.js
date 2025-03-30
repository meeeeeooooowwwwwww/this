#!/usr/bin/env node

const { execSync } = require('child_process');

async function deployWithD1() {
  console.log('Starting deployment with D1 database support...');
  
  try {
    // Deploy the worker with D1 binding
    console.log('Deploying Worker script with D1 binding...');
    execSync('npx wrangler deploy', { stdio: 'inherit' });
    
    // Deploy the static files to Cloudflare Pages
    console.log('\nDeploying static files to Cloudflare Pages...');
    execSync('npx wrangler pages deploy public --project-name=business-directory-site', { stdio: 'inherit' });
    
    console.log('\nDeployment completed successfully!');
    console.log('\nNote: Your search now uses the D1 database. If you need to migrate data from KV to D1,');
    console.log('run the migration script separately or enter data directly in the D1 dashboard.');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deployWithD1(); 