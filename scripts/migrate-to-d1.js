#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Migrate KV data to D1 Database
 */
async function migrateToD1() {
  console.log('Starting migration from KV to D1 database...');
  
  const KV_DATA_DIR = path.join(__dirname, 'kv-data');
  
  // Create SQL file for videos table
  const createVideosSql = `
DROP TABLE IF EXISTS videos;
CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  link TEXT,
  thumbnail TEXT,
  uploader TEXT,
  category TEXT
);
`;
  fs.writeFileSync('create-videos.sql', createVideosSql);
  
  // Execute the SQL to create videos table
  console.log('Creating videos table...');
  try {
    execSync('npx wrangler d1 execute nataliewinters-db --file=create-videos.sql --remote --yes', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error creating videos table, but continuing...', error.message);
  }
  
  // Create SQL file for articles table
  const createArticlesSql = `
DROP TABLE IF EXISTS articles;
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  date TEXT
);
`;
  fs.writeFileSync('create-articles.sql', createArticlesSql);
  
  // Execute the SQL to create articles table
  console.log('Creating articles table...');
  try {
    execSync('npx wrangler d1 execute nataliewinters-db --file=create-articles.sql --remote --yes', { stdio: 'inherit' });
  } catch (error) {
    console.error('Error creating articles table, but continuing...', error.message);
  }
  
  // Migrate videos (limit to first 10 for testing)
  const videosPath = path.join(KV_DATA_DIR, 'natalie-videos.json');
  if (fs.existsSync(videosPath)) {
    try {
      let videos = JSON.parse(fs.readFileSync(videosPath, 'utf8'));
      
      // For testing, just use the first 10 videos
      videos = videos.slice(0, 10);
      
      console.log(`Migrating ${videos.length} videos to D1...`);
      
      // Process each video individually
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        
        try {
          // Skip videos with missing required fields
          if (!video.id) {
            console.warn(`Skipping video at index ${i} due to missing ID`);
            continue;
          }
          
          const title = video.title || 'Untitled Video';
          const description = video.description || '';
          const link = video.link || '';
          const thumbnail = video.thumbnail || '';
          const uploader = video.uploader || 'Natalie Winters';
          const category = video.category || 'news';
          
          // Create SQL for single video insert
          const videoInsertSql = `
INSERT OR REPLACE INTO videos (id, title, description, link, thumbnail, uploader, category)
VALUES (
  '${video.id.replace(/'/g, "''")}',
  '${title.replace(/'/g, "''")}',
  '${description.replace(/'/g, "''")}',
  '${link.replace(/'/g, "''")}',
  '${thumbnail.replace(/'/g, "''")}',
  '${uploader.replace(/'/g, "''")}',
  '${category.replace(/'/g, "''")}'
);`;
          
          fs.writeFileSync('insert-video.sql', videoInsertSql);
          
          execSync('npx wrangler d1 execute nataliewinters-db --file=insert-video.sql --remote --yes', { stdio: 'inherit' });
          
          console.log(`Inserted video ${i + 1}/${videos.length}: ${video.id}`);
        } catch (error) {
          console.error(`Error inserting video ${i + 1}/${videos.length}: ${video.id}`, error.message);
        }
      }
      
      console.log('Videos migration completed.');
    } catch (error) {
      console.error('Error migrating videos:', error);
    }
  } else {
    console.warn(`Video data file not found: ${videosPath}`);
  }
  
  // Migrate articles
  const articlesPath = path.join(KV_DATA_DIR, 'articles.json');
  if (fs.existsSync(articlesPath)) {
    try {
      const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
      console.log(`Migrating ${articles.length} articles to D1...`);
      
      // Process each article individually
      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        
        try {
          // Skip articles with missing required fields
          if (!article.id) {
            console.warn(`Skipping article at index ${i} due to missing ID`);
            continue;
          }
          
          const title = article.title || 'Untitled Article';
          const description = article.description || '';
          const date = article.date || new Date().toISOString().split('T')[0];
          
          // Create SQL for single article insert
          const articleInsertSql = `
INSERT OR REPLACE INTO articles (id, title, description, date)
VALUES (
  '${article.id.replace(/'/g, "''")}',
  '${title.replace(/'/g, "''")}',
  '${description.replace(/'/g, "''")}',
  '${date.replace(/'/g, "''")}'
);`;
          
          fs.writeFileSync('insert-article.sql', articleInsertSql);
          
          execSync('npx wrangler d1 execute nataliewinters-db --file=insert-article.sql --remote --yes', { stdio: 'inherit' });
          
          console.log(`Inserted article ${i + 1}/${articles.length}: ${article.id}`);
        } catch (error) {
          console.error(`Error inserting article ${i + 1}/${articles.length}: ${article.id}`, error.message);
        }
      }
      
      console.log('Articles migration completed.');
    } catch (error) {
      console.error('Error migrating articles:', error);
    }
  } else {
    console.warn(`Article data file not found: ${articlesPath}`);
  }
  
  // Clean up SQL files
  try {
    fs.unlinkSync('create-videos.sql');
    fs.unlinkSync('create-articles.sql');
    if (fs.existsSync('insert-video.sql')) fs.unlinkSync('insert-video.sql');
    if (fs.existsSync('insert-article.sql')) fs.unlinkSync('insert-article.sql');
  } catch (error) {
    console.error('Error cleaning up SQL files:', error);
  }
  
  console.log('Migration to D1 database completed.');
}

// Execute the migration
migrateToD1(); 