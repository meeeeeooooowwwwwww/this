#!/usr/bin/env node

console.log('Starting test script...');
const fs = require('fs');
const path = require('path');

// List all files in the current directory
try {
  console.log('Listing files in current directory:');
  const files = fs.readdirSync(__dirname);
  console.log(files);
  
  // Check if public directory exists
  const publicDir = path.join(__dirname, 'public');
  console.log('\nChecking if public directory exists:', publicDir);
  console.log('Exists:', fs.existsSync(publicDir));
  
  // List files in public directory if it exists
  if (fs.existsSync(publicDir)) {
    console.log('\nListing files in public directory:');
    const publicFiles = fs.readdirSync(publicDir);
    console.log(publicFiles);
    
    // Check for data directory
    const dataDir = path.join(publicDir, 'data');
    console.log('\nChecking if data directory exists:', dataDir);
    console.log('Exists:', fs.existsSync(dataDir));
    
    // List files in data directory if it exists
    if (fs.existsSync(dataDir)) {
      console.log('\nListing files in data directory:');
      const dataFiles = fs.readdirSync(dataDir);
      console.log(dataFiles);
    }
  }
  
  // Create a test directory and file
  const testDir = path.join(__dirname, 'test-dir');
  console.log('\nCreating test directory:', testDir);
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
    console.log('Test directory created successfully.');
  } else {
    console.log('Test directory already exists.');
  }
  
  const testFile = path.join(testDir, 'test-file.txt');
  console.log('\nCreating test file:', testFile);
  fs.writeFileSync(testFile, 'This is a test file.');
  console.log('Test file created successfully.');
  
  console.log('\nTest script completed successfully.');
} catch (error) {
  console.error('Error in test script:', error);
} 