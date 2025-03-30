const fs = require('fs');
const path = require('path');

// Extract video ID from Rumble URL or Key
function extractVideoId(key, url) {
  if (key && key.includes(':')) {
    return key.split(':')[1]; // Extract ID from key like 'source:id'
  }
  // Fallback to URL regex if key format is different or missing
  const match = url ? url.match(/\/v([a-zA-Z0-9]+)-/) : null;
  return match ? match[1] : '';
}

// Transform videos data (handles both Natalie and WarRoom formats)
function transformVideos(inputData) {
  let videoCounter = 0; // Initialize counter
  return inputData.map(item => {
    videoCounter++; // Increment counter for each video
    // Default values
    let idFromKey = '';
    let sourceType = 'unknown';
    let platformId = '';
    let uploader = item.value.uploader ? item.value.uploader.replace('https://', '') : 'Unknown';

    // Parse key to get ID and source type
    if (item.key && item.key.includes(':')) {
      const parts = item.key.split(':');
      sourceType = parts[0];
      idFromKey = parts[1]; // Original ID from key
      platformId = idFromKey; // Assume ID from key is the platform ID
    } else {
      // Fallback if key format is unexpected
      platformId = extractVideoId(null, item.value.link);
      idFromKey = platformId || `fallback-${videoCounter}`; // Use fallback ID if needed
    }

    // Extract title components for tags
    const titleWords = (item.value.title || '').toLowerCase()
      .replace(/[^\\w\\s]/g, '')
      .split(/\\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    return {
      id: `video-${videoCounter}`, // Use counter for guaranteed unique ID
      title: item.value.title || 'Untitled Video',
      description: item.value.description || '', // Add description if available
      link: item.value.link || '',
      thumbnail: item.value.thumbnail || '',
      uploader: uploader,
      category: 'news', // Default category
      platform: 'rumble', // Assuming rumble for now
      platform_id: platformId,
      duration: null, // Placeholder
      views: null,    // Placeholder
      likes: null,    // Placeholder
      publish_date: new Date().toISOString().split('T')[0], // Placeholder - Might need parsing from video page later
      tags: titleWords.join(','),
      source_type: sourceType,
      transcript: null, // Placeholder
      metadata: JSON.stringify({
        original_key: item.key,
        original_id_from_key: idFromKey, // Store the original ID from key in metadata
        original_uploader: item.value.uploader || null
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

// Transform articles data
function transformArticles(inputData) {
  return inputData.map((item, index) => {
    // Extract title components for tags
    const titleWords = (item.title || '').toLowerCase()
      .replace(/[^\\w\\s]/g, '')
      .split(/\\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    // Estimate read time (simple calculation)
    const wordCount = (item.content || '').split(/\\s+/).length;
    const readTime = wordCount > 0 ? Math.ceil(wordCount / 200) : null;

    // Determine category
    let category = 'news'; // Default
    if (item.categories && Array.isArray(item.categories) && item.categories.length > 0) {
      category = item.categories[0]; // Use the first category if available
    }

    return {
      id: `article-${item.fileName ? item.fileName.replace('.html', '') : index + 1}`, // Use filename or index for ID
      title: item.title || 'Untitled Article',
      description: item.excerpt || '', // Use excerpt for description
      date: item.publishedDate || new Date().toISOString().split('T')[0], // Use publishedDate for date
      author: item.author || 'War Room Staff',
      content: item.content || '',
      url: item.sourceUrl || '', // Use sourceUrl for url
      source: 'War Room', // Hardcoded source for now
      category: category,
      tags: titleWords.join(','),
      image_url: item.featuredImage || item.images?.[0] || '', // Use featuredImage or first image
      read_time: readTime,
      is_featured: false, // Default
      status: 'published', // Default
      metadata: JSON.stringify({
        original_index: index,
        original_filename: item.fileName || null,
        original_categories: item.categories || []
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

// Transform businesses data
function transformBusinesses(inputData) {
  return inputData.map(item => {
    // Helper function to handle "Currently Unavailable"
    const getValueOrNull = (value) => (value === "Currently Unavailable" ? null : value);

    return {
      id: item.key, // Use the key directly as ID
      name: getValueOrNull(item.value.title) || 'Unnamed Business', // Ensure name is not null
      description: getValueOrNull(item.value.description),
      address: getValueOrNull(item.value.address),
      phone: getValueOrNull(item.value.phone),
      email: getValueOrNull(item.value.email),
      website: getValueOrNull(item.value.website),
      internal_url: getValueOrNull(item.value.url),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

async function transformData() {
  try {
    // --- Video Transformation ---
    // Define paths for video files relative to project root
    const natalieVideosPath = path.join(__dirname, '..', 'public', 'data', 'videos', 'natalie-winters-videos.json');
    const warroomVideosPath = path.join(__dirname, '..', 'public', 'data', 'videos', 'warroom-videos.json');

    // Read video data
    console.log(`Reading Natalie Winters videos from ${natalieVideosPath}...`);
    const natalieVideosData = JSON.parse(fs.readFileSync(natalieVideosPath, 'utf8'));
    console.log(`Reading War Room videos from ${warroomVideosPath}...`);
    const warroomVideosData = JSON.parse(fs.readFileSync(warroomVideosPath, 'utf8'));

    // Combine video data
    const combinedVideosData = natalieVideosData.concat(warroomVideosData);
    console.log(`Combined video count: ${combinedVideosData.length}`);

    // Transform combined videos
    const transformedVideos = transformVideos(combinedVideosData);

    // Write transformed videos to project root
    const outputVideosPath = path.join(__dirname, '..', 'd1-import-videos.json');
    fs.writeFileSync(outputVideosPath, JSON.stringify(transformedVideos, null, 2));
    console.log(`Transformed videos data written to ${outputVideosPath}`);

    // --- Article Transformation ---
    // Define path for articles file relative to project root
    const articlesPath = path.join(__dirname, '..', 'public', 'data', 'articles', 'warroom-articles.json');

    // Read articles data
    console.log(`Reading War Room articles from ${articlesPath}...`);
    const articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
    console.log(`Article count: ${articlesData.length}`);

    // Transform articles
    const transformedArticles = transformArticles(articlesData);

    // Write transformed articles to project root
    const outputArticlesPath = path.join(__dirname, '..', 'd1-import-articles.json');
    fs.writeFileSync(outputArticlesPath, JSON.stringify(transformedArticles, null, 2));
    console.log(`Transformed articles data written to ${outputArticlesPath}`);

    // --- Business Transformation ---
    // Define path for businesses file relative to project root
    const businessesPath = path.join(__dirname, '..', 'public', 'data', 'businesses', 'business-listings.json');
    console.log(`Reading business listings from ${businessesPath}...`);
    const businessesData = JSON.parse(fs.readFileSync(businessesPath, 'utf8'));
    console.log(`Business listing count: ${businessesData.length}`);

    // Transform businesses
    const transformedBusinesses = transformBusinesses(businessesData);

    // Write transformed businesses to project root
    const outputBusinessesPath = path.join(__dirname, '..', 'd1-import-businesses.json');
    fs.writeFileSync(outputBusinessesPath, JSON.stringify(transformedBusinesses, null, 2));
    console.log(`Transformed businesses data written to ${outputBusinessesPath}`);

  } catch (error) {
    console.error('Error transforming data:', error);
    process.exit(1); // Exit with error code
  }
}

transformData(); 