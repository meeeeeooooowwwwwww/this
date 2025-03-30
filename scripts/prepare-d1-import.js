const fs = require('fs');
const path = require('path');
const { Transform } = require('stream');
const JSONStream = require('jsonstream-next');

const INPUT_JSON_PATH = path.join(__dirname, '..', 'd1-import-products.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'sql-imports');
const PRODUCTS_PER_FILE = 1000; // Adjust this if statements get too large (Reduced from 5000)
const PRODUCTS_PER_INSERT = 50; // Products per INSERT statement (Reduced from 100)

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

// Create table SQL (first file)
const createTableSQL = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT NOT NULL,
  image_link TEXT,
  availability TEXT,
  price TEXT,
  sale_price TEXT,
  brand TEXT,
  gtin TEXT,
  mpn TEXT,
  google_product_category TEXT,
  google_product_category_name TEXT,
  product_type TEXT,
  condition TEXT,
  adult TEXT,
  item_group_id TEXT,
  advertiser_name TEXT,
  advertiser_url TEXT,
  catalog_name TEXT,
  last_updated_feed TEXT,
  currency TEXT,
  numeric_price REAL,
  created_at TEXT,
  updated_at TEXT
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_advertiser ON products(advertiser_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(google_product_category);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(numeric_price);
`;

fs.writeFileSync(path.join(OUTPUT_DIR, '000-create-table.sql'), createTableSQL);

// Create a transform stream to convert products to SQL statements
class ProductToSQL extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });
    this.buffer = [];
    this.fileCount = 0;
    this.totalProducts = 0;
    this.currentFileProducts = 0;
    this.currentFile = null;
  }

  // Helper function to properly escape and quote SQL strings
  sql(value) {
    if (value === null || value === undefined) return 'NULL';
    // Ensure value is a string, replace single quotes, backslashes, 
    // and potentially control characters that might break SQL
    const strValue = String(value)
      .replace(/'/g, "''") // Escape single quotes
      .replace(/\/g, '\\') // Escape backslashes
      .replace(/[\x00-\x1F\x7F]/g, ''); // Remove NUL and other control chars
    return `'${strValue}'`;
  }

  _transform(product, encoding, callback) {
    this.buffer.push(product);
    this.totalProducts++;
    this.currentFileProducts++;

    // If we've reached PRODUCTS_PER_INSERT, write an INSERT statement
    if (this.buffer.length >= PRODUCTS_PER_INSERT) {
      this._writeInsertStatement();
    }

    // If we've reached PRODUCTS_PER_FILE, start a new file
    if (this.currentFileProducts >= PRODUCTS_PER_FILE) {
      this._startNewFile();
    }

    callback();
  }

  _flush(callback) {
    // Write any remaining products
    if (this.buffer.length > 0) {
      this._writeInsertStatement();
    }
    
    // Close the last file if open
    if (this.currentFile) {
      this.currentFile.end();
    }

    console.log(`\nProcessing complete!`);
    console.log(`Total products processed: ${this.totalProducts}`);
    console.log(`Total files created: ${this.fileCount}`);
    
    callback();
  }

  _startNewFile() {
    if (this.currentFile) {
      this.currentFile.end();
    }
    
    this.fileCount++;
    const filename = `${String(this.fileCount).padStart(3, '0')}-import-products.sql`;
    console.log(`Creating file ${filename} (products ${this.totalProducts - this.currentFileProducts + 1}-${this.totalProducts})`);
    
    this.currentFile = fs.createWriteStream(path.join(OUTPUT_DIR, filename));
    this.currentFileProducts = 0;
  }

  _writeInsertStatement() {
    if (!this.currentFile) {
      this._startNewFile();
    }

    const values = this.buffer.map(p => `(
      ${this.sql(p.id)},
      ${this.sql(p.title)},
      ${this.sql(p.description)},
      ${this.sql(p.link)},
      ${this.sql(p.image_link)},
      ${this.sql(p.availability)},
      ${this.sql(p.price)},
      ${this.sql(p.sale_price)},
      ${this.sql(p.brand)},
      ${this.sql(p.gtin)},
      ${this.sql(p.mpn)},
      ${this.sql(p.google_product_category)},
      ${this.sql(p.google_product_category_name)},
      ${this.sql(p.product_type)},
      ${this.sql(p.condition)},
      ${this.sql(p.adult)},
      ${this.sql(p.item_group_id)},
      ${this.sql(p.advertiser_name)},
      ${this.sql(p.advertiser_url)},
      ${this.sql(p.catalog_name)},
      ${this.sql(p.last_updated_feed)},
      ${this.sql(p.currency)},
      ${p.numeric_price === null ? 'NULL' : p.numeric_price},
      ${this.sql(p.created_at)},
      ${this.sql(p.updated_at)}
    )`).join(',\n');

    const sqlStatement = `
INSERT INTO products (
  id,
  title,
  description,
  link,
  image_link,
  availability,
  price,
  sale_price,
  brand,
  gtin,
  mpn,
  google_product_category,
  google_product_category_name,
  product_type,
  condition,
  adult,
  item_group_id,
  advertiser_name,
  advertiser_url,
  catalog_name,
  last_updated_feed,
  currency,
  numeric_price,
  created_at,
  updated_at
) VALUES
${values};

`;

    this.currentFile.write(sqlStatement);
    this.buffer = [];
  }
}

console.log('Starting to process products...');

// Create the processing pipeline
fs.createReadStream(INPUT_JSON_PATH)
  .pipe(JSONStream.parse('*'))
  .pipe(new ProductToSQL())
  .on('finish', () => {
    console.log('\nImport files created successfully!');
    console.log(`\nTo import, run these commands in order:`);
    console.log('1. Create table and indexes:');
    console.log('npx wrangler d1 execute DB_NAME --remote --file=sql-imports/000-create-table.sql');
    console.log('\n2. Import data files in sequence:');
    console.log('for f in sql-imports/[0-9]*.sql; do echo "Importing $f..."; npx wrangler d1 execute DB_NAME --remote --file="$f"; done');
  })
  .on('error', (err) => {
    console.error('Error processing file:', err);
    process.exit(1);
  }); 