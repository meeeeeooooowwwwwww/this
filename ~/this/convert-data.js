#!/usr/bin/env node

/**
 * Data Conversion Script
 * 
 * This script reads data from the public/data directory and converts it
 * to the format needed for Cloudflare KV storage.
 */

console.log('Starting data conversion script...');

const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'kv-data');
console.log('Output directory will be:', outputDir);

if (!fs.existsSync(outputDir)) {
  console.log('Creating output directory...');
  fs.mkdirSync(outputDir);
}

// Main conversion function
async function convertData() {
  console.log('Converting data for Cloudflare KV storage...');

  try {
    // Convert businesses data
    await convertBusinesses();
    
    // Convert categories data
    await createCategories();
    
    console.log('Data conversion completed successfully!');
  } catch (error) {
    console.error('Error during data conversion:', error);
  }
}

// Convert businesses data
async function convertBusinesses() {
  console.log('Converting businesses data...');
  
  try {
    // Read the original business data file
    const businessDataPath = path.join(__dirname, 'public', 'data', 'businesses', 'business-listings.json');
    console.log('Looking for business data at:', businessDataPath);
    
    // Check if file exists
    if (!fs.existsSync(businessDataPath)) {
      console.error('Business data file not found:', businessDataPath);
      return [];
    }
    
    // Read and parse the file
    const rawData = fs.readFileSync(businessDataPath, 'utf8');
    const originalBusinesses = JSON.parse(rawData);
    
    // Sample/limit the data (KV has size limitations)
    // Get first 100 businesses or all if less than 100
    const businesses = Array.isArray(originalBusinesses) 
      ? originalBusinesses.slice(0, 100)
      : originalBusinesses.businesses?.slice(0, 100) || [];
    
    // Transform data to our format
    const transformedBusinesses = businesses.map((business, index) => {
      // Determine the structure based on the actual data
      const title = business.title || business.name || business.business_name || `Business ${index + 1}`;
      const description = business.description || business.about || business.summary || 'No description available';
      const category = business.category || business.type || business.business_type || 'General';
      
      return {
        id: business.id || `biz${index + 1}`,
        title: title,
        description: description,
        category: category,
        rating: business.rating || (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
        location: business.location || business.address || 'No location available',
        phone: business.phone || business.contact || '(555) 123-4567',
        url: business.url || `/business/${title.toLowerCase().replace(/\s+/g, '-')}`,
        image: business.image || business.photo || `https://source.unsplash.com/random/800x600/?${category.toLowerCase().replace(/\s+/g, '-')}`
      };
    });
    
    // Write to output file
    const outputPath = path.join(outputDir, 'businesses.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformedBusinesses, null, 2));
    
    console.log(`Converted ${transformedBusinesses.length} businesses to ${outputPath}`);
    return transformedBusinesses;
  } catch (error) {
    console.error('Error converting businesses data:', error);
    return [];
  }
}

// Create categories data based on businesses
async function createCategories() {
  console.log('Creating categories data...');
  
  try {
    // Get businesses first (reuse the already transformed data if possible)
    const businessesPath = path.join(outputDir, 'businesses.json');
    let businesses = [];
    
    if (fs.existsSync(businessesPath)) {
      businesses = JSON.parse(fs.readFileSync(businessesPath, 'utf8'));
    } else {
      businesses = await convertBusinesses();
    }
    
    // Extract unique categories from businesses
    const categoryMap = {};
    businesses.forEach(business => {
      const category = business.category;
      if (category && !categoryMap[category]) {
        categoryMap[category] = {
          count: 1,
          id: `cat${Object.keys(categoryMap).length + 1}`
        };
      } else if (category) {
        categoryMap[category].count++;
      }
    });
    
    // Transform to category objects
    const categories = Object.keys(categoryMap).map(categoryName => {
      const urlName = categoryName.toLowerCase().replace(/\s+/g, '-');
      return {
        id: categoryMap[categoryName].id,
        title: categoryName,
        description: `${categoryName} businesses in your area`,
        count: categoryMap[categoryName].count,
        url: `/category/${urlName}`,
        image: `https://source.unsplash.com/random/800x600/?${urlName}`
      };
    });
    
    // Write to output file
    const outputPath = path.join(outputDir, 'categories.json');
    fs.writeFileSync(outputPath, JSON.stringify(categories, null, 2));
    
    console.log(`Created ${categories.length} categories to ${outputPath}`);
  } catch (error) {
    console.error('Error creating categories data:', error);
  }
}

// Run the conversion
convertData(); 