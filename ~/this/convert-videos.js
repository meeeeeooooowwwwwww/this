#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'kv-data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Convert Natalie Winters videos data
async function convertNatalieVideos() {
  console.log('Converting Natalie Winters videos data...');
  
  try {
    // Read the original videos data file
    const videosDataPath = path.join(__dirname, 'public', 'data', 'videos', 'natalie-videos', 'natalie-winters-videos.json');
    console.log('Looking for videos data at:', videosDataPath);
    
    // Check if file exists
    if (!fs.existsSync(videosDataPath)) {
      console.error('Natalie Winters videos data file not found:', videosDataPath);
      return [];
    }
    
    // Read and parse the file
    const rawData = fs.readFileSync(videosDataPath, 'utf8');
    const originalVideos = JSON.parse(rawData);
    
    console.log(`Found ${originalVideos.length} videos in the original data`);
    
    // Transform data to our format - keep only first 100 for KV size limitations
    const transformedVideos = originalVideos.slice(0, 100).map((video, index) => {
      return {
        id: video.key.replace('natalie:', '') || `video${index + 1}`,
        title: video.value.title || 'Untitled Video',
        description: video.value.description || video.value.title || 'No description available',
        link: video.value.link || '#',
        thumbnail: video.value.thumbnail || '',
        uploader: video.value.uploader || 'Unknown',
        category: 'Videos',
        type: 'natalie'
      };
    });
    
    // Write to output file
    const outputPath = path.join(outputDir, 'natalie-videos.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformedVideos, null, 2));
    
    console.log(`Converted ${transformedVideos.length} Natalie Winters videos to ${outputPath}`);
    return transformedVideos;
  } catch (error) {
    console.error('Error converting Natalie Winters videos data:', error);
    return [];
  }
}

// Main conversion function
async function convertData() {
  console.log('Starting video data conversion...');
  
  try {
    // Convert videos data
    await convertNatalieVideos();
    
    console.log('Video data conversion completed successfully!');
  } catch (error) {
    console.error('Error during data conversion:', error);
  }
}

// Run the conversion
convertData(); 