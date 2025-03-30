const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
// Removed SFTP-related requires: AdmZip, SftpClient

// Load environment variables from .dev.vars file for local execution (might still be needed for other config?)
require('dotenv').config({ path: path.resolve(__dirname, '..', '.dev.vars') });

// --- Configuration ---
const FEEDS_DIRECTORY = path.join(__dirname, '..', 'product-feeds'); // Directory containing the .txt feed files
const OUTPUT_JSON_PATH = path.join(__dirname, '..', 'd1-import-products.json'); // Output JSON path in project root
const TEMP_OUTPUT_DIR = path.join(__dirname, '..', 'temp_output');
const BATCH_SIZE = 100; // Write every 100 products

// --- Helper Functions ---

// Ensure temp directory exists
function ensureTempDir() {
  if (!fs.existsSync(TEMP_OUTPUT_DIR)) {
    fs.mkdirSync(TEMP_OUTPUT_DIR);
  }
}

// Function to transform a single record
function transformRecord(record, feedFilePath) {
  try {
    // Extract price and currency
    const priceString = record.PRICE || record.SALE_PRICE || '0 USD';
    const priceMatch = priceString.match(/([0-9.]+)\s*([A-Z]{3})?/);
    const numericPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
    const currency = priceMatch && priceMatch[2] ? priceMatch[2] : null;

    // Map feed headers to database columns
    const product = {
      id: record.ID,
      title: record.TITLE,
      description: record.DESCRIPTION,
      link: record.LINK,
      image_link: record.IMAGE_LINK,
      availability: record.AVAILABILITY,
      price: record.PRICE,
      sale_price: record.SALE_PRICE,
      brand: record.BRAND,
      gtin: record.GTIN,
      mpn: record.MPN,
      google_product_category: record.GOOGLE_PRODUCT_CATEGORY,
      google_product_category_name: record.GOOGLE_PRODUCT_CATEGORY_NAME,
      product_type: record.PRODUCT_TYPE,
      condition: record.CONDITION,
      adult: record.ADULT,
      item_group_id: record.ITEM_GROUP_ID,
      advertiser_name: record.PROGRAM_NAME,
      advertiser_url: record.PROGRAM_URL,
      catalog_name: record.CATALOG_NAME,
      last_updated_feed: record.LAST_UPDATED,
      currency: currency,
      numeric_price: numericPrice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Basic validation
    if (!product.id || !product.title || !product.link) {
      const missingFields = ['id', 'title', 'link'].filter(f => !product[f]).join(', ');
      console.warn(`[${path.basename(feedFilePath)}] Skipping record due to missing required field(s): ${missingFields}. Record ID: ${record.ID || 'N/A'}`);
      return null;
    }

    return product;
  } catch (error) {
    console.warn(`Error transforming record: ${error.message}`);
    return null;
  }
}

// Process a single file
async function processFile(feedFilePath, isFirstFile) {
  console.log(`Processing ${path.basename(feedFilePath)}...`);
  let productsInBatch = [];
  let totalProducts = 0;
  let lastProgressUpdate = Date.now();

  try {
    const parser = fs.createReadStream(feedFilePath)
      .pipe(parse({
        delimiter: '\t',
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      }));

    for await (const record of parser) {
      const product = transformRecord(record, feedFilePath);
      
      if (product) {
        productsInBatch.push(product);
        totalProducts++;

        // Write batch if we've reached BATCH_SIZE
        if (productsInBatch.length >= BATCH_SIZE) {
          await writeBatchToFile(productsInBatch, isFirstFile && totalProducts <= BATCH_SIZE);
          productsInBatch = [];
        }

        // Show progress every 5 seconds
        if (Date.now() - lastProgressUpdate > 5000) {
          console.log(`   Processed ${totalProducts} products so far...`);
          lastProgressUpdate = Date.now();
        }
      }
    }

    // Write any remaining products
    if (productsInBatch.length > 0) {
      await writeBatchToFile(productsInBatch, isFirstFile && totalProducts === productsInBatch.length);
    }

    console.log(`✓ Completed ${path.basename(feedFilePath)}: ${totalProducts} products processed`);
    return totalProducts;
  } catch (error) {
    console.error(`Error processing file ${feedFilePath}:`, error);
    return 0;
  }
}

// Write a batch of products to the output file
async function writeBatchToFile(products, isFirst) {
  if (products.length === 0) return;

  const json = JSON.stringify(products, null, 2)
    .slice(1, -1) // Remove [] from the array
    .trim();

  try {
    if (isFirst) {
      fs.appendFileSync(OUTPUT_JSON_PATH, json);
    } else {
      fs.appendFileSync(OUTPUT_JSON_PATH, ',\n' + json);
    }
  } catch (error) {
    console.error('Error writing to output file:', error);
    throw error;
  }
}

// Main function
async function runLocalTransformation() {
  console.log(`--- Starting Local Feed Transformation ---`);
  console.log(`Reading feed files from: ${FEEDS_DIRECTORY}`);
  
  try {
    // Ensure temp directory exists
    ensureTempDir();
    
    const files = fs.readdirSync(FEEDS_DIRECTORY);
    const txtFiles = files.filter(file => file.toLowerCase().endsWith('.txt'));

    if (txtFiles.length === 0) {
      console.warn(`No .txt files found in ${FEEDS_DIRECTORY}. Exiting.`);
      return;
    }

    console.log(`Found ${txtFiles.length} .txt files to process:`);
    txtFiles.forEach(f => console.log(`  - ${f}`));

    let totalProducts = 0;
    let processedFiles = 0;

    // Initialize the output file with an opening bracket
    fs.writeFileSync(OUTPUT_JSON_PATH, '[\n');

    for (const txtFile of txtFiles) {
      try {
        console.log(`\nFile ${++processedFiles}/${txtFiles.length}: ${txtFile}`);
        const feedFilePath = path.join(FEEDS_DIRECTORY, txtFile);
        
        const productsProcessed = await processFile(feedFilePath, processedFiles === 1);
        totalProducts += productsProcessed;

        // Show overall progress
        const progress = ((processedFiles / txtFiles.length) * 100).toFixed(1);
        console.log(`Progress: ${progress}% (${processedFiles}/${txtFiles.length} files)`);
        console.log(`Total products so far: ${totalProducts}`);

      } catch (error) {
        console.error(`Failed to process ${txtFile}:`, error);
        console.log('Continuing with next file...');
      }
    }

    // Close the JSON array
    fs.appendFileSync(OUTPUT_JSON_PATH, '\n]');

    console.log(`\n--- Transformation Complete ---`);
    console.log(`Successfully processed ${processedFiles} files`);
    console.log(`Total products collected: ${totalProducts}`);
    console.log(`Output written to: ${OUTPUT_JSON_PATH}`);

  } catch (error) {
    console.error('Error during transformation:', error);
    process.exit(1);
  }
}

// Run the transformation
runLocalTransformation();

// Removed original runTransformation() call and manual test functions 