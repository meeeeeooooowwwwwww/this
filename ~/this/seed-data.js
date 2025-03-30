#!/usr/bin/env node

// Script to seed sample data to Cloudflare KV Storage

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Function to load data from files
function loadDataFromFiles() {
  const kvData = {};
  const kvDataDir = path.join(__dirname, 'kv-data');
  
  // Check if kv-data directory exists
  if (!fs.existsSync(kvDataDir)) {
    console.log('kv-data directory not found. Running data conversion script first...');
    try {
      execSync('node convert-data.js', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error running conversion script:', error);
      return null;
    }
  }
  
  // Load businesses data
  const businessesPath = path.join(kvDataDir, 'businesses.json');
  if (fs.existsSync(businessesPath)) {
    try {
      kvData.businesses = JSON.parse(fs.readFileSync(businessesPath, 'utf8'));
      console.log(`Loaded ${kvData.businesses.length} businesses from file`);
    } catch (error) {
      console.error('Error loading businesses data:', error);
      // Use fallback data
      kvData.businesses = fallbackData.businesses;
    }
  } else {
    console.log('Businesses data file not found, using fallback data');
    kvData.businesses = fallbackData.businesses;
  }
  
  // Load categories data
  const categoriesPath = path.join(kvDataDir, 'categories.json');
  if (fs.existsSync(categoriesPath)) {
    try {
      kvData.categories = JSON.parse(fs.readFileSync(categoriesPath, 'utf8'));
      console.log(`Loaded ${kvData.categories.length} categories from file`);
    } catch (error) {
      console.error('Error loading categories data:', error);
      // Use fallback data
      kvData.categories = fallbackData.categories;
    }
  } else {
    console.log('Categories data file not found, using fallback data');
    kvData.categories = fallbackData.categories;
  }
  
  return kvData;
}

// Fallback sample data in case conversion fails
const fallbackData = {
  businesses: [
    {
      id: "biz1",
      title: "Riverside Cafe",
      description: "A cozy cafe with riverside views and organic coffee",
      category: "Food & Dining",
      rating: 4.7,
      location: "123 River St, Riverside",
      phone: "(555) 123-4567",
      url: "/business/riverside-cafe",
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "biz2",
      title: "Tech Solutions Inc",
      description: "IT support and digital solutions for small businesses",
      category: "Technology",
      rating: 4.5,
      location: "456 Tech Blvd, Downtown",
      phone: "(555) 987-6543",
      url: "/business/tech-solutions",
      image: "https://images.unsplash.com/photo-1573164713988-8665fc963095?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "biz3",
      title: "Green Thumb Nursery",
      description: "Local plant nursery with a wide selection of indoor and outdoor plants",
      category: "Home & Garden",
      rating: 4.9,
      location: "789 Garden Way, Greenfield",
      phone: "(555) 456-7890",
      url: "/business/green-thumb",
      image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "biz4",
      title: "Fitness First Gym",
      description: "24/7 fitness center with state-of-the-art equipment and personal training",
      category: "Health & Fitness",
      rating: 4.3,
      location: "101 Fitness Ave, Sportsville",
      phone: "(555) 234-5678",
      url: "/business/fitness-first",
      image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "biz5",
      title: "Bookworm Bookstore",
      description: "Independent bookstore with new and used books, plus a reading cafe",
      category: "Shopping",
      rating: 4.8,
      location: "202 Reader's Lane, Biblioville",
      phone: "(555) 345-6789",
      url: "/business/bookworm",
      image: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    }
  ],
  categories: [
    {
      id: "cat1",
      title: "Food & Dining",
      description: "Restaurants, cafes, bakeries, and more",
      count: 42,
      url: "/category/food-dining",
      image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "cat2",
      title: "Technology",
      description: "IT services, repair shops, and tech stores",
      count: 28,
      url: "/category/technology",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "cat3",
      title: "Home & Garden",
      description: "Nurseries, hardware stores, and home services",
      count: 35,
      url: "/category/home-garden",
      image: "https://images.unsplash.com/photo-1558882224-dda166733046?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "cat4",
      title: "Health & Fitness",
      description: "Gyms, yoga studios, and wellness centers",
      count: 31,
      url: "/category/health-fitness",
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    },
    {
      id: "cat5",
      title: "Shopping",
      description: "Retail stores, boutiques, and specialty shops",
      count: 50,
      url: "/category/shopping",
      image: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
    }
  ]
};

console.log('Seeding KV storage with data...');

// Load data from either converted files or fallback
const data = loadDataFromFiles() || fallbackData;

// Function to add data to KV storage
function seedKVData() {
  // Get the namespace ID from wrangler.toml
  let namespaceId = '';
  try {
    const wranglerConfig = require('fs').readFileSync('./wrangler.toml', 'utf8');
    const namespaceMatch = wranglerConfig.match(/id\s*=\s*"([^"]*)"/);
    if (namespaceMatch && namespaceMatch[1]) {
      namespaceId = namespaceMatch[1];
    } else {
      console.log('No namespace ID found in wrangler.toml');
      console.log('Update your wrangler.toml with your KV namespace ID');
      return;
    }
  } catch (error) {
    console.error('Error reading wrangler.toml:', error);
    return;
  }

  // Upload data to KV storage
  try {
    // First check if wrangler is installed
    try {
      execSync('wrangler --version', { stdio: 'ignore' });
    } catch (error) {
      console.log('Wrangler not found. Installing...');
      execSync('npm install -g wrangler', { stdio: 'inherit' });
    }

    // Save data to KV storage
    Object.keys(data).forEach(key => {
      const value = JSON.stringify(data[key]);
      const tmpFile = `./${key}.json`;
      require('fs').writeFileSync(tmpFile, value);
      
      console.log(`Uploading ${key} data to KV storage...`);
      execSync(`wrangler kv:key put --binding=DIRECTORY_DATA "${key}" --path=${tmpFile}`, { stdio: 'inherit' });
      
      // Clean up temporary file
      require('fs').unlinkSync(tmpFile);
    });

    console.log('Data seeding complete!');
  } catch (error) {
    console.error('Error seeding KV data:', error);
  }
}

seedKVData(); 