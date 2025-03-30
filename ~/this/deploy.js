#!/usr/bin/env node

/**
 * Deployment script for the Business Directory site to Cloudflare Pages
 * 
 * This script helps:
 * 1. Publish Workers for API functionality
 * 2. Seed KV with initial data (if needed)
 * 3. Deploy the static site to Cloudflare Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Verify Cloudflare configuration
function verifyConfiguration() {
  console.log('Verifying Cloudflare configuration...');
  
  try {
    // Check if wrangler.toml exists
    if (!fs.existsSync('./wrangler.toml')) {
      console.error('Error: wrangler.toml file not found!');
      console.log('Please create a wrangler.toml file with your Cloudflare configuration.');
      process.exit(1);
    }
    
    // Check if wrangler is installed
    try {
      execSync('wrangler --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('Wrangler CLI not found. Installing...');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
    }
    
    // Verify Cloudflare login
    try {
      execSync('wrangler whoami', { stdio: 'ignore' });
    } catch (error) {
      console.log('Please login to Cloudflare:');
      execSync('wrangler login', { stdio: 'inherit' });
    }
    
    console.log('✅ Configuration verified!');
    return true;
  } catch (error) {
    console.error('Error during configuration verification:', error);
    return false;
  }
}

// Deploy Worker script
function deployWorker() {
  console.log('Deploying Worker script...');
  
  try {
    execSync('wrangler publish worker.js', { stdio: 'inherit' });
    console.log('✅ Worker deployed successfully!');
    return true;
  } catch (error) {
    console.error('Error deploying Worker:', error);
    return false;
  }
}

// Seed KV storage with initial data
function seedKVStorage() {
  console.log('Seeding KV storage with initial data...');
  
  try {
    execSync('node seed-data.js', { stdio: 'inherit' });
    console.log('✅ KV storage seeded successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding KV storage:', error);
    return false;
  }
}

// Deploy static site to Cloudflare Pages
function deployPages() {
  console.log('Deploying static site to Cloudflare Pages...');
  
  try {
    // Check if Pages project exists or create a new one
    let projectExists = false;
    
    try {
      execSync('wrangler pages project list | grep "business-directory"', { stdio: 'ignore' });
      projectExists = true;
    } catch (error) {
      // Project doesn't exist, create it
      console.log('Creating new Cloudflare Pages project...');
      execSync('wrangler pages project create business-directory', { stdio: 'inherit' });
    }
    
    // Deploy to Pages
    execSync('wrangler pages deploy ./public --project-name=business-directory', { stdio: 'inherit' });
    
    console.log('✅ Static site deployed successfully!');
    return true;
  } catch (error) {
    console.error('Error deploying to Pages:', error);
    return false;
  }
}

// Main deployment function
async function deploy() {
  console.log('\n🚀 Business Directory Deployment\n');
  
  // Verify configuration
  if (!verifyConfiguration()) {
    console.error('Failed to verify configuration. Deployment aborted.');
    process.exit(1);
  }
  
  // Confirm deployment
  rl.question('Do you want to deploy the Worker script? (y/n): ', (deployWorkerAnswer) => {
    if (deployWorkerAnswer.toLowerCase() === 'y') {
      if (!deployWorker()) {
        console.error('Failed to deploy Worker. Deployment aborted.');
        process.exit(1);
      }
    }
    
    rl.question('Do you want to seed KV storage with initial data? (y/n): ', (seedDataAnswer) => {
      if (seedDataAnswer.toLowerCase() === 'y') {
        if (!seedKVStorage()) {
          console.error('Failed to seed KV storage. Deployment aborted.');
          process.exit(1);
        }
      }
      
      rl.question('Do you want to deploy the static site to Cloudflare Pages? (y/n): ', (deployPagesAnswer) => {
        if (deployPagesAnswer.toLowerCase() === 'y') {
          if (!deployPages()) {
            console.error('Failed to deploy to Pages. Deployment aborted.');
            process.exit(1);
          }
        }
        
        console.log('\n✨ Deployment completed successfully!');
        rl.close();
      });
    });
  });
}

// Run the deployment
deploy(); 