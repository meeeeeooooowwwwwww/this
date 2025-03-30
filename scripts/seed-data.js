#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Seed KV data to Cloudflare
 */
async function seedData() {
  console.log('Starting Cloudflare KV data seeding...');
  
  const KV_DATA_DIR = path.join(__dirname, 'kv-data');
  
  // Seed Natalie Winters videos
  const videosPath = path.join(KV_DATA_DIR, 'natalie-videos.json');
  if (fs.existsSync(videosPath)) {
    try {
      const videos = JSON.parse(fs.readFileSync(videosPath, 'utf8'));
      console.log(`Seeding ${videos.length} videos to Cloudflare KV...`);
      
      // Create a temporary file with the JSON data to avoid command line escaping issues
      const tempFile = path.join(__dirname, 'temp-videos.json');
      fs.writeFileSync(tempFile, JSON.stringify(videos));
      
      // Upload entire collection as one key using file reference
      console.log('Uploading entire collection...');
      
      // Upload to SEARCH_DATA
      const searchCollectionCommand = `npx wrangler kv key put --binding=SEARCH_DATA "videos:natalie-winters" --path="${tempFile}"`;
      console.log(`Executing: ${searchCollectionCommand}`);
      execSync(searchCollectionCommand, { stdio: 'inherit' });
      
      // Upload to DIRECTORY_DATA as well
      const directoryCollectionCommand = `npx wrangler kv key put --binding=DIRECTORY_DATA "natalie-videos" --path="${tempFile}"`;
      console.log(`Executing: ${directoryCollectionCommand}`);
      execSync(directoryCollectionCommand, { stdio: 'inherit' });
      
      // Also upload individual videos for direct access (limit to first 10 for testing)
      console.log('Uploading individual videos...');
      const videoLimit = Math.min(videos.length, 10);
      for (let i = 0; i < videoLimit; i++) {
        const video = videos[i];
        const tempVideoFile = path.join(__dirname, `temp-video-${i}.json`);
        fs.writeFileSync(tempVideoFile, JSON.stringify(video));
        
        const command = `npx wrangler kv key put --binding=SEARCH_DATA "video:${video.id}" --path="${tempVideoFile}"`;
        console.log(`Seeding video ${i + 1}/${videoLimit}`);
        execSync(command, { stdio: 'inherit' });
        
        // Clean up temp file
        fs.unlinkSync(tempVideoFile);
      }
      
      // Clean up collection temp file
      fs.unlinkSync(tempFile);
      
      console.log('Video data seeding completed.');
    } catch (error) {
      console.error('Error seeding video data:', error);
    }
  } else {
    console.warn(`Video data file not found: ${videosPath}`);
    console.log('Creating videos directory structure...');
    
    // Make sure directories exist
    fs.mkdirSync(path.join(__dirname, 'public', 'data', 'videos', 'natalie-videos'), { recursive: true });
    fs.mkdirSync(KV_DATA_DIR, { recursive: true });
    
    // Create a simple sample video JSON
    const sampleVideos = [
      {
        id: 'nw-video-1',
        title: 'Sample Video 1',
        description: 'This is a sample video for testing',
        link: 'https://example.com/video1',
        thumbnail: 'https://via.placeholder.com/320x180.png?text=Sample+Video+1',
        uploader: 'Natalie Winters',
        category: 'news',
        type: 'video'
      },
      {
        id: 'nw-video-2',
        title: 'Sample Video 2',
        description: 'Another sample video for testing',
        link: 'https://example.com/video2',
        thumbnail: 'https://via.placeholder.com/320x180.png?text=Sample+Video+2',
        uploader: 'Natalie Winters',
        category: 'news',
        type: 'video'
      }
    ];
    
    // Write sample videos to both locations
    fs.writeFileSync(videosPath, JSON.stringify(sampleVideos, null, 2));
    console.log(`Created sample videos file at: ${videosPath}`);
    
    // Now run the seeding process again with the sample data
    const tempFile = path.join(__dirname, 'temp-videos.json');
    fs.writeFileSync(tempFile, JSON.stringify(sampleVideos));
    
    console.log('Uploading sample videos collection...');
    
    // Upload to SEARCH_DATA
    const searchCollectionCommand = `npx wrangler kv key put --binding=SEARCH_DATA "videos:natalie-winters" --path="${tempFile}"`;
    console.log(`Executing: ${searchCollectionCommand}`);
    execSync(searchCollectionCommand, { stdio: 'inherit' });
    
    // Upload to DIRECTORY_DATA as well
    const directoryCollectionCommand = `npx wrangler kv key put --binding=DIRECTORY_DATA "natalie-videos" --path="${tempFile}"`;
    console.log(`Executing: ${directoryCollectionCommand}`);
    execSync(directoryCollectionCommand, { stdio: 'inherit' });
    
    // Upload individual sample videos
    console.log('Uploading individual sample videos...');
    for (let i = 0; i < sampleVideos.length; i++) {
      const video = sampleVideos[i];
      const tempVideoFile = path.join(__dirname, `temp-video-${i}.json`);
      fs.writeFileSync(tempVideoFile, JSON.stringify(video));
      
      const command = `npx wrangler kv key put --binding=SEARCH_DATA "video:${video.id}" --path="${tempVideoFile}"`;
      console.log(`Seeding sample video ${i + 1}/${sampleVideos.length}`);
      execSync(command, { stdio: 'inherit' });
      
      // Clean up temp file
      fs.unlinkSync(tempVideoFile);
    }
    
    // Clean up collection temp file
    fs.unlinkSync(tempFile);
  }
  
  // Seed Articles
  const articlesPath = path.join(KV_DATA_DIR, 'articles.json');
  if (fs.existsSync(articlesPath)) {
    try {
      const articles = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
      console.log(`Seeding ${articles.length} articles to Cloudflare KV...`);
      
      // Create a temporary file with the JSON data
      const tempFile = path.join(__dirname, 'temp-articles.json');
      fs.writeFileSync(tempFile, JSON.stringify(articles));
      
      // Upload to SEARCH_DATA
      const searchCommand = `npx wrangler kv key put --binding=SEARCH_DATA "articles" --path="${tempFile}"`;
      console.log(`Executing: ${searchCommand}`);
      execSync(searchCommand, { stdio: 'inherit' });
      
      // Upload to DIRECTORY_DATA
      const directoryCommand = `npx wrangler kv key put --binding=DIRECTORY_DATA "articles" --path="${tempFile}"`;
      console.log(`Executing: ${directoryCommand}`);
      execSync(directoryCommand, { stdio: 'inherit' });
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      console.log('Article data seeding completed.');
    } catch (error) {
      console.error('Error seeding article data:', error);
    }
  } else {
    console.warn(`Article data file not found: ${articlesPath}`);
  }
  
  console.log('Cloudflare KV data seeding completed.');
}

// Execute the seeding
seedData();
