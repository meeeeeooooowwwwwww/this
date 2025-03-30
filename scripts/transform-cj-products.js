const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // No longer needed for SFTP
const AdmZip = require('adm-zip');
const { parse } = require('csv-parse');
const SftpClient = require('ssh2-sftp-client'); // SFTP Client library

// Load environment variables from .dev.vars file for local execution
require('dotenv').config({ path: path.resolve(__dirname, '.dev.vars') });

// --- Configuration ---
// const FEED_URL = process.env.CJ_FEED_URL; // No longer needed
// const CJ_USER = process.env.CJ_USERNAME; // Use SFTP specific vars
// const CJ_PASS = process.env.CJ_PASSWORD;

const SFTP_CONFIG_BASE = { // Renamed to avoid conflict
  host: process.env.CJ_SFTP_HOST,
  port: parseInt(process.env.CJ_SFTP_PORT || '22', 10),
  username: process.env.CJ_SFTP_USER,
  password: process.env.CJ_SFTP_PASS
};
const REMOTE_PATH = process.env.CJ_SFTP_REMOTE_PATH; // Directory on SFTP server
const FILE_PREFIX = 'AllAdvertisersDailyHTTP-shopping-'; // Start of the filename
const FILE_SUFFIX = '.zip'; // End of the filename

const DOWNLOAD_PATH = path.join(__dirname, 'cj-feed-download.zip');
const EXTRACT_PATH = path.join(__dirname, 'cj-feed-extracted');
const OUTPUT_JSON_PATH = path.join(__dirname, 'd1-import-products.json');
const EXPECTED_TEXT_FILENAME_PART = '-shopping.txt';

// --- Helper Functions ---

// Function to download the latest feed via SFTP
async function downloadLatestFeedViaSftp() {
    if (!SFTP_CONFIG_BASE.host || !SFTP_CONFIG_BASE.username || !SFTP_CONFIG_BASE.password || !REMOTE_PATH) {
        throw new Error('Missing CJ SFTP configuration in environment variables (.dev.vars or secrets)');
    }

    // Expanded explicit algorithms configuration
    const sftpConnectOptions = {
      ...SFTP_CONFIG_BASE,
      algorithms: {
        // Server Host Key Algorithms (Adding ssh-dss)
        serverHostKey: [
          'ssh-dss', // <--- ADDED deprecated algorithm offered by server
          'ssh-rsa',
          'ssh-ed25519', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384',
          'ecdsa-sha2-nistp521', 'rsa-sha2-512', 'rsa-sha2-256'
        ],
        // Key Exchange Algorithms (keep expanded list)
        kex: [
          'diffie-hellman-group14-sha1', 'diffie-hellman-group-exchange-sha256',
          'diffie-hellman-group14-sha256', 'diffie-hellman-group16-sha512',
          'diffie-hellman-group18-sha512', 'ecdh-sha2-nistp256',
          'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521',
          'curve25519-sha256', 'curve25519-sha256@libssh.org'
        ],
        // Cipher Algorithms (keep expanded list)
        cipher: [
          'aes128-ctr', 'aes192-ctr', 'aes256-ctr',
          'aes128-gcm', 'aes128-gcm@openssh.com', 'aes256-gcm', 'aes256-gcm@openssh.com',
          'chacha20-poly1305@openssh.com', 'aes256-cbc', 'aes192-cbc', 'aes128-cbc'
        ],
        // MAC Algorithms (keep expanded list)
        hmac: [
          'hmac-sha2-256-etm@openssh.com', 'hmac-sha2-512-etm@openssh.com',
          'hmac-sha1-etm@openssh.com', 'hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'
        ]
      }
    };


    const sftp = new SftpClient();
    try {
        console.log(`Connecting to SFTP server ${sftpConnectOptions.host} with EXPANDED custom algorithms...`); // Updated log message
        await sftp.connect(sftpConnectOptions); // Use the expanded options
        console.log(`Connected. Listing files in ${REMOTE_PATH}...`);

        const fileList = await sftp.list(REMOTE_PATH);

        // Filter files matching the pattern and sort by modified time (descending)
        const feedFiles = fileList
            .filter(file =>
                file.type === '-' && // Ensure it's a file, not a directory
                file.name.startsWith(FILE_PREFIX) &&
                file.name.endsWith(FILE_SUFFIX)
            )
            .sort((a, b) => b.modifyTime - a.modifyTime); // Sort newest first

        if (feedFiles.length === 0) {
            throw new Error(`No feed files matching '${FILE_PREFIX}*${FILE_SUFFIX}' found in ${REMOTE_PATH}`);
        }

        const latestFile = feedFiles[0];
        const remoteFilePath = path.join(REMOTE_PATH, latestFile.name).replace(/\\/g, '/'); // Ensure forward slashes for SFTP path

        console.log(`Found latest feed file: ${latestFile.name}. Downloading...`);

        // Ensure local download directory exists (though DOWNLOAD_PATH is a file)
        const downloadDir = path.dirname(DOWNLOAD_PATH);
         if (!fs.existsSync(downloadDir)) {
            fs.mkdirSync(downloadDir, { recursive: true });
        }

        await sftp.get(remoteFilePath, DOWNLOAD_PATH);
        console.log(`Feed downloaded successfully to ${DOWNLOAD_PATH}`);

    } catch (err) {
        console.error(`SFTP Error: ${err.message}`);
        throw err; // Re-throw the error after logging
    } finally {
        try {
            await sftp.end();
            console.log('SFTP connection closed.');
        } catch (endErr) {
            console.error('Error closing SFTP connection:', endErr);
        }
    }
}

// Function to extract the feed
function extractFeed() {
  console.log(`Extracting feed from ${DOWNLOAD_PATH}...`);
  try {
    const zip = new AdmZip(DOWNLOAD_PATH);
    // Ensure the extraction directory exists
    if (!fs.existsSync(EXTRACT_PATH)) {
        fs.mkdirSync(EXTRACT_PATH);
    }
    zip.extractAllTo(EXTRACT_PATH, /*overwrite*/ true);

    // Find the actual .txt file
    const entries = zip.getEntries();
    // Adjust finding logic slightly: look inside the extracted directory now
    const extractedFiles = fs.readdirSync(EXTRACT_PATH);
    const txtFileName = extractedFiles.find(file => file.endsWith(EXPECTED_TEXT_FILENAME_PART));

    if (!txtFileName) {
        // Fallback check in zip entries if direct read fails (though unlikely needed)
        const feedEntry = entries.find(entry => entry.entryName.endsWith(EXPECTED_TEXT_FILENAME_PART));
         if (!feedEntry) {
            throw new Error(`Could not find a file ending with '${EXPECTED_TEXT_FILENAME_PART}' in the extracted files or zip archive.`);
         }
         // If found via zip entries, the path construction logic needs care, better to rely on readdirSync
         throw new Error(`Could not find '${EXPECTED_TEXT_FILENAME_PART}' in extracted files at ${EXTRACT_PATH}`);

    }

    const feedFilePath = path.join(EXTRACT_PATH, txtFileName);
    console.log(`Feed extracted successfully. Found data file: ${feedFilePath}`);
    return feedFilePath; // Return the path to the extracted .txt file
  } catch (error) {
    console.error(`Error extracting zip file: ${error}`);
    throw error;
  }
}

// Function to parse TSV and transform data
async function parseAndTransform(feedFilePath) {
  console.log(`Parsing and transforming data from ${feedFilePath}...`);
  const transformedProducts = [];

  // Define parser options for TSV
  const parser = fs.createReadStream(feedFilePath)
    .pipe(parse({
      delimiter: '\t',       // Tab delimiter
      columns: true,          // Use the first row as headers
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true // Allow varying column counts potentially
    }));

  for await (const record of parser) {
    // --- Updated Header Mapping ---

    // Extract price and currency
    const priceString = record.PRICE || record.SALE_PRICE || '0 USD'; // Use PRICE from headers
    const priceMatch = priceString.match(/([0-9.]+)\s*([A-Z]{3})?/);
    const numericPrice = priceMatch ? parseFloat(priceMatch[1]) : null;
    const currency = priceMatch && priceMatch[2] ? priceMatch[2] : null;

    // Map feed headers to database columns
    const product = {
      id: record.ID, // Use 'ID' header
      title: record.TITLE,
      description: record.DESCRIPTION,
      link: record.LINK, // **CRITICAL**: Verify this is the CJ affiliate link!
      image_link: record.IMAGE_LINK,
      availability: record.AVAILABILITY,
      price: record.PRICE, // Store raw price string
      sale_price: record.SALE_PRICE, // Store raw sale price string
      brand: record.BRAND,
      gtin: record.GTIN,
      mpn: record.MPN,
      google_product_category: record.GOOGLE_PRODUCT_CATEGORY, // Numeric ID
      google_product_category_name: record.GOOGLE_PRODUCT_CATEGORY_NAME, // Category name string
      product_type: record.PRODUCT_TYPE, // Advertiser's category
      condition: record.CONDITION,
      adult: record.ADULT,
      item_group_id: record.ITEM_GROUP_ID,
      advertiser_name: record.PROGRAM_NAME, // Use PROGRAM_NAME for advertiser
      advertiser_url: record.PROGRAM_URL,
      catalog_name: record.CATALOG_NAME,
      last_updated_feed: record.LAST_UPDATED, // Timestamp from feed
      currency: currency,
      numeric_price: numericPrice,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Basic validation (ensure required fields are present)
    if (product.id && product.title && product.link) {
         // Optionally add more specific checks, e.g., for CJ domain in link
         // if (product.link && !product.link.toLowerCase().includes('some.cj.domain')) {
         //    console.warn(`Link for product ID ${product.id} doesn't look like a CJ link: ${product.link}.`);
         // }
         transformedProducts.push(product);
    } else {
        // Log which field was missing if needed
        const missingFields = ['id', 'title', 'link'].filter(f => !product[f]).join(', ');
        console.warn(`Skipping record due to missing required field(s): ${missingFields}. Record ID (if available): ${record.ID || 'N/A'}`);
    }
  }

  console.log(`Parsed and transformed ${transformedProducts.length} products.`);
  return transformedProducts;
}

// Main function to run the process
async function runTransformation() {
  try {
    // --- TEMPORARY: Use local sample file ---
    console.log('--- USING LOCAL SAMPLE FEED ---');
    const localSampleFilePath = path.join(__dirname, 'cj-sample-feed.txt');
    if (!fs.existsSync(localSampleFilePath)) {
        throw new Error(`Local sample file not found at ${localSampleFilePath}. Please copy and rename it.`);
    }
    const feedFilePath = localSampleFilePath; // Use local path directly
    // --- END TEMPORARY ---

    // --- ORIGINAL SFTP/ZIP LOGIC (Commented Out) ---
    // await downloadLatestFeedViaSftp();
    // const feedFilePath = extractFeed(); // This line is effectively replaced by the one above
    // --- END ORIGINAL ---

    const transformedData = await parseAndTransform(feedFilePath);

    // Write the transformed data to JSON
    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(transformedData, null, 2));
    console.log(`Transformed product data written to ${OUTPUT_JSON_PATH}`);

    // Clean up (skip for local sample)
    // fs.unlinkSync(DOWNLOAD_PATH);
    // fs.rmSync(EXTRACT_PATH, { recursive: true, force: true });
    // console.log('Cleaned up temporary files.');

  } catch (error) {
    console.error('Error during CJ product transformation:', error);
    process.exit(1);
  }
}

// --- Execute ---
runTransformation(); 