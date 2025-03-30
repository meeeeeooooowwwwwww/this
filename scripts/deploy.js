#!/usr/bin/env node

const { execSync } = require('child_process');

async function deploy() {
  console.log('Starting deployment to Cloudflare...');
  
  try {
    // Step 1: Upload the worker script
    console.log('Deploying Worker script...');
    execSync('npx wrangler deploy', { stdio: 'inherit' });
    
    // Step 2: Deploy the static files to Cloudflare Pages
    console.log('\nDeploying static files to Cloudflare Pages...');
    execSync('npx wrangler pages deploy public --project-name=business-directory-site', { stdio: 'inherit' });
    
    console.log('\nDeployment completed successfully!');
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the deployment
deploy();
