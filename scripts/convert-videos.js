#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ensure output directory exists
const KV_DATA_DIR = path.join(__dirname, 'kv-data');
if (!fs.existsSync(KV_DATA_DIR)) {
  fs.mkdirSync(KV_DATA_DIR, { recursive: true });
}

/**
 * Convert Natalie Winters videos to KV format
 */
function convertNatalieVideos() {
  const sourcePath = path.join(__dirname, 'public', 'data', 'videos', 'natalie-videos', 'natalie-winters-videos.json');
  console.log(`Checking for file at: ${sourcePath}`);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found: ${sourcePath}`);
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    console.log(`Found ${data.length} videos`);

    // Transform the data - limit to first 100 videos for now
    const transformed = data.slice(0, 100).map((video, index) => ({
      id: `nw-video-${index + 1}`,
      title: video.title,
      description: video.title, // Using title as description since original doesn't have descriptions
      link: video.link,
      thumbnail: video.thumbnail,
      uploader: video.uploader,
      category: 'news',
      type: 'video'
    }));

    const outputPath = path.join(KV_DATA_DIR, 'natalie-videos.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));
    console.log(`Converted ${transformed.length} videos to: ${outputPath}`);
  } catch (error) {
    console.error('Error converting videos:', error);
  }
}

/**
 * Convert all data files to KV format
 */
function convertData() {
  console.log('Starting data conversion for KV storage...');
  convertNatalieVideos();
  console.log('Data conversion complete.');
}

// Execute the conversion
convertData(); 