const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BATCH_SIZE = 25; // Process 25 records at a time

async function importToD1() {
  try {
    console.log('Starting D1 database import (Products Only - Sample Data)...');

    // Ensure tables exist
    console.log('Ensuring database tables exist...');
    // execSync('npx wrangler d1 execute nataliewinters-db --file=./sql_scripts/create-videos.sql --remote'); // Keep videos commented
    // execSync('npx wrangler d1 execute nataliewinters-db --file=./sql_scripts/create-articles.sql --remote'); // TEMP: Skip articles
    // execSync('npx wrangler d1 execute nataliewinters-db --file=./sql_scripts/create-businesses.sql --remote'); // TEMP: Skip businesses
    execSync('npx wrangler d1 execute nataliewinters-db --file=./sql_scripts/create-products.sql --remote'); // Ensure products table exists

    // Read the transformed data
    console.log('Reading transformed data...');
    // const videos = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'd1-import-videos.json'), 'utf8'));
    // const articles = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'd1-import-articles.json'), 'utf8')); // TEMP: Skip articles
    // const businesses = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'd1-import-businesses.json'), 'utf8')); // TEMP: Skip businesses

    // Read product data if file exists
    const productsPath = path.join(__dirname, '..', 'd1-import-products.json');
    let products = [];
    if (fs.existsSync(productsPath)) {
        console.log('Reading transformed products data...');
        products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
    } else {
        // Throw error if product file is missing when we intend to only import products
        throw new Error(`Product import file not found (${productsPath}). Ensure transformation script ran successfully.`);
    }

    // Skip processing videos
    /*
    console.log('Processing videos...');
    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = videos.slice(i, i + BATCH_SIZE);
      const batchInserts = batch.map(video => {
        const values = [
          video.id,
          video.title,
          video.description,
          video.link,
          video.thumbnail,
          video.uploader,
          video.category,
          video.platform,
          video.platform_id,
          video.duration,
          video.views,
          video.likes,
          video.publish_date,
          video.tags,
          video.source_type,
          video.transcript,
          video.metadata,
          video.created_at,
          video.updated_at
        ].map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          return val;
        });
        
        return `INSERT INTO videos (
          id, title, description, link, thumbnail, uploader, category,
          platform, platform_id, duration, views, likes, publish_date,
          tags, source_type, transcript, metadata, created_at, updated_at
        ) VALUES (${values.join(', ')});`;
      });
      
      // Write and execute batch
      const batchFile = `insert-videos-batch-${Math.floor(i / BATCH_SIZE)}.sql`;
      fs.writeFileSync(batchFile, batchInserts.join('\n'));
      console.log(`Importing videos batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videos.length / BATCH_SIZE)}...`);
      execSync(`npx wrangler d1 execute nataliewinters-db --file=./${batchFile} --remote`); // Added --remote
      fs.unlinkSync(batchFile);
    }
    */
    
    // TEMP: Skip articles processing
    /*
    console.log('Processing articles...');
    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const batchInserts = batch.map(article => {
        const values = [
          article.id,
          article.title,
          article.description,
          article.date,
          article.author,
          article.content,
          article.url,
          article.source,
          article.category,
          article.tags,
          article.image_url,
          article.read_time,
          article.is_featured ? 1 : 0,
          article.status,
          article.metadata,
          article.created_at,
          article.updated_at
        ].map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          return val;
        });
        
        return `INSERT INTO articles (
          id, title, description, date, author, content, url,
          source, category, tags, image_url, read_time, is_featured,
          status, metadata, created_at, updated_at
        ) VALUES (${values.join(', ')});`;
      });
      
      // Write and execute batch
      const batchFile = `insert-articles-batch-${Math.floor(i / BATCH_SIZE)}.sql`;
      fs.writeFileSync(batchFile, batchInserts.join('\n'));
      console.log(`Importing articles batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(articles.length / BATCH_SIZE)}...`);
      execSync(`npx wrangler d1 execute nataliewinters-db --file=./${batchFile} --remote`);
      fs.unlinkSync(batchFile);
    }
    */

    // TEMP: Skip businesses processing
    /*
    console.log('Processing businesses...');
    for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
      // ... business batch processing loop ...
        execSync(`npx wrangler d1 execute nataliewinters-db --file=./${batchFile} --remote`);
        fs.unlinkSync(batchFile);
    }
    */

    // Process products in batches (if data was loaded)
    if (products.length > 0) {
        console.log('Processing products...');
        for (let i = 0; i < products.length; i += BATCH_SIZE) {
            const batch = products.slice(i, i + BATCH_SIZE);
            const batchInserts = batch.map(product => {
            const values = [
                product.id,
                product.title,
                product.description,
                product.link,
                product.image_link,
                product.availability,
                product.price,
                product.sale_price,
                product.brand,
                product.gtin,
                product.mpn,
                product.google_product_category,
                product.google_product_category_name,
                product.product_type,
                product.condition,
                product.adult,
                product.item_group_id,
                product.advertiser_name,
                product.advertiser_url,
                product.catalog_name,
                product.last_updated_feed,
                product.currency,
                product.numeric_price,
                product.created_at,
                product.updated_at
            ].map(val => {
                if (val === null || val === undefined) return 'NULL';
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                if (typeof val === 'number') return val;
                return `'${String(val).replace(/'/g, "''")}'`;
            });

            return `INSERT INTO products (
                id, title, description, link, image_link, availability, price, sale_price,
                brand, gtin, mpn, google_product_category, google_product_category_name,
                product_type, condition, adult, item_group_id, advertiser_name, advertiser_url,
                catalog_name, last_updated_feed, currency, numeric_price, created_at, updated_at
            ) VALUES (${values.join(', ')});`;
            });

            // Write and execute batch
            const batchFile = `insert-products-batch-${Math.floor(i / BATCH_SIZE)}.sql`;
            fs.writeFileSync(batchFile, batchInserts.join('\n'));
            console.log(`Importing products batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(products.length / BATCH_SIZE)}...`);
            execSync(`npx wrangler d1 execute nataliewinters-db --file=./${batchFile} --remote`);
            fs.unlinkSync(batchFile); // Clean up the batch file
        }
    } else {
        console.log('Product data array is empty. No products to import.');
    }

    console.log('Import completed successfully!');
    
  } catch (error) {
    console.error('Error during import:', error);
    // Propagate error for potential CI/CD failure
    process.exit(1);
  }
}

importToD1(); 