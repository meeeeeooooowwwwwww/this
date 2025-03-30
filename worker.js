/**
 * Business Directory - Search Worker
 *
 * This Cloudflare Worker provides:
 * 1. A search API endpoint
 * 2. Data retrieval endpoints for categories and businesses
 * 3. Video data retrieval for Natalie Winters videos
 */

// Define the routes for the Worker
const routes = {
  search: new URLPattern({ pathname: '/api/search' }),
  videos: new URLPattern({ pathname: '/api/videos/:collection' }),
  video: new URLPattern({ pathname: '/api/video/:id' }),
  data: new URLPattern({ pathname: '/api/data' })
};

// Define pagination defaults
const PAGINATION = {
  defaultLimit: 12,
  maxLimit: 50
};

// Set CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Helper function for error responses
function errorResponse(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// Helper function for JSON responses
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

// Process search results to highlight matching terms
function processSearchResults(results, query) {
  if (!query || query.trim() === '') return results;
  
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  if (terms.length === 0) return results;
  
  return results.map(item => {
    // Calculate a simple relevance score based on number of matches
    let score = 0;
    const titleLower = item.title.toLowerCase();
    const descLower = item.description ? item.description.toLowerCase() : '';
    
    terms.forEach(term => {
      if (titleLower.includes(term)) score += 3;
      if (descLower && descLower.includes(term)) score += 1;
    });
    
    return {
      ...item,
      relevance: score
    };
  })
  .filter(item => item.relevance > 0)
  .sort((a, b) => b.relevance - a.relevance);
}

// Handle OPTIONS requests for CORS
async function handleOptions(request) {
  return new Response(null, {
    headers: corsHeaders
  });
}

// Search function that looks through D1 database
async function searchData(env, query, options = {}) {
  try {
    const { type } = options;
    // Validate and sanitize inputs
    let page = parseInt(options.page, 10) || 1;
    let limit = parseInt(options.limit, 10) || PAGINATION.defaultLimit;
    page = Math.max(1, page); // Ensure page is at least 1
    limit = Math.min(PAGINATION.maxLimit, Math.max(1, limit)); // Ensure limit is between 1 and maxLimit
    const cleanQuery = (query || '').trim(); // Trim whitespace

    const offset = (page - 1) * limit;
    
    let results = [];
    let total = 0;
    
    // Prepare the search query with wildcards for partial matching
    const searchTerm = `%${cleanQuery.toLowerCase()}%`; // Use cleanQuery
    
    if (!type || type === 'video') {
      // For videos, use a simpler query
      const sqlQuery = `
        SELECT 
          id, title, description, link, thumbnail, uploader, 'video' as type
        FROM videos 
        WHERE 
          LOWER(title) LIKE ? OR 
          LOWER(description) LIKE ?
        LIMIT ? OFFSET ?
      `;
      
      try {
        // Execute the query
        const videosData = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
          .bind(searchTerm, searchTerm, limit, offset)
          .all();
        
        if (videosData.results) {
          results.push(...videosData.results);
        }
  
        // Get total count for pagination
        const videoCountData = await env.NATALIEWINTERS_DB.prepare(`
          SELECT COUNT(*) as count FROM videos 
          WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?
        `)
          .bind(searchTerm, searchTerm)
          .first();
        
        total += videoCountData?.count || 0;
      } catch (videoError) {
        console.error('Error searching videos:', videoError);
      }
    }
    
    if (!type || type === 'article') {
      // For articles, use a simpler query
      const sqlQuery = `
        SELECT 
          id, title, description, date, 'article' as type
        FROM articles 
        WHERE 
          LOWER(title) LIKE ? OR 
          LOWER(description) LIKE ?
        LIMIT ? OFFSET ?
      `;
      
      try {
        // Execute the query
        const articlesData = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
          .bind(searchTerm, searchTerm, limit, offset)
          .all();
        
        if (articlesData.results) {
          results.push(...articlesData.results);
        }
  
        // Get total count for pagination
        const articleCountData = await env.NATALIEWINTERS_DB.prepare(`
          SELECT COUNT(*) as count FROM articles 
          WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?
        `)
          .bind(searchTerm, searchTerm)
          .first();
        
        total += articleCountData?.count || 0;
      } catch (articleError) {
        console.error('Error searching articles:', articleError);
      }
    }

    // Add search for businesses
    if (!type || type === 'business') {
      const sqlQuery = `
        SELECT 
          id, name as title, description, address, phone, website as url, 'business' as type 
        FROM businesses 
        WHERE 
          LOWER(name) LIKE ?1 OR 
          LOWER(description) LIKE ?1 OR
          LOWER(address) LIKE ?1
        LIMIT ?2 OFFSET ?3
      `;
      
      try {
        const businessesData = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
          .bind(searchTerm, limit, offset)
          .all();
          
        if (businessesData.results) {
          results.push(...businessesData.results);
        }
  
        const businessCountData = await env.NATALIEWINTERS_DB.prepare(`
          SELECT COUNT(*) as count FROM businesses 
          WHERE LOWER(name) LIKE ?1 OR LOWER(description) LIKE ?1 OR LOWER(address) LIKE ?1
        `)
          .bind(searchTerm)
          .first();
          
        total += businessCountData?.count || 0;
      } catch (businessError) {
        console.error('Error searching businesses:', businessError);
      }
    }

    // Add search for products
    if (!type || type === 'product') {
      // Define columns to search within products table
      const productSearchColumns = ['title', 'description', 'brand', 'google_product_category_name'];
      // Use distinct placeholders ?1, ?2, ?3, ?4
      const productWhereClause = productSearchColumns.map((col, index) => `LOWER(${col}) LIKE ?${index + 1}`).join(' OR ');

      const sqlQuery = `
        SELECT
          id, title, description, link, image_link, brand, price, 'product' as type
        FROM products
        WHERE ${productWhereClause} // e.g., WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?2 ...
        LIMIT ?${productSearchColumns.length + 1} OFFSET ?${productSearchColumns.length + 2}
      `;

      const countSqlQuery = `
        SELECT COUNT(*) as count
        FROM products
        WHERE ${productWhereClause} // e.g., WHERE LOWER(title) LIKE ?1 OR LOWER(description) LIKE ?2 ...
      `;

      try {
        // Execute the query for results
        const productsData = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
          // Bind searchTerm for each placeholder (?1, ?2, ?3, ?4), then limit and offset
          .bind(searchTerm, searchTerm, searchTerm, searchTerm, limit, offset)
          .all();

        if (productsData.results) {
          results.push(...productsData.results);
        }

        // Get total count for pagination
        const productCountData = await env.NATALIEWINTERS_DB.prepare(countSqlQuery)
          // Bind searchTerm for each placeholder (?1, ?2, ?3, ?4)
          .bind(searchTerm, searchTerm, searchTerm, searchTerm)
          .first();

        total += productCountData?.count || 0;
      } catch (productError) {
        console.error('Error searching products:', productError);
        // Optionally decide if you want to throw the error or just log it
      }
    }

    // If no type filter is applied, sort combined results by relevance
    if (!type && results.length > 0) {
      results = processSearchResults(results, cleanQuery); // Use cleanQuery
    }

    return {
      results,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      },
      query
    };
  } catch (error) {
    console.error('Search error:', error);
    throw new Error('Failed to search data: ' + error.message);
  }
}

// Get data by type from D1 database with pagination
async function getData(env, options = {}) {
  try {
    const { type, page: pageOpt = 1, limit: limitOpt = PAGINATION.defaultLimit } = options;

    // Validate type
    if (!type || !['videos', 'articles'].includes(type)) {
        return errorResponse('Invalid data type specified.', 400);
    }

    // Validate and sanitize pagination
    let page = parseInt(pageOpt, 10) || 1;
    let limit = parseInt(limitOpt, 10) || PAGINATION.defaultLimit;
    page = Math.max(1, page);
    limit = Math.min(PAGINATION.maxLimit, Math.max(1, limit));
    const offset = (page - 1) * limit;
    
    let sqlQuery = '';
    let countQuery = '';
    
    switch (type) {
      case 'videos':
        sqlQuery = `
          SELECT 
            id, title, description, link, thumbnail, uploader, 'video' as type
          FROM videos
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = `SELECT COUNT(*) as count FROM videos`;
        break;
      case 'articles':
        sqlQuery = `
          SELECT 
            id, title, description, date, 'article' as type
          FROM articles
          ORDER BY date DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = `SELECT COUNT(*) as count FROM articles`;
        break;
      default:
        throw new Error('Invalid data type requested');
    }
    
    const data = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
      .bind(limit, offset)
      .all();
    
    const countData = await env.NATALIEWINTERS_DB.prepare(countQuery)
      .first();
    
    const total = countData?.count || 0;
    
    return {
      results: data.results || [],
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Get data error:', error);
    throw new Error(`Failed to get ${type} data`);
  }
}

// Main handler for the worker
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }

      // Log the database connection and request path
      console.log(`Processing request: ${url.pathname}`);
      
      try {
        // Test D1 connection
        const testResult = await env.NATALIEWINTERS_DB.prepare("SELECT 1 as test").first();
        console.log("D1 connection test:", testResult);
        
        // Get table counts for debugging
        try {
          const videoCount = await env.NATALIEWINTERS_DB.prepare("SELECT COUNT(*) as count FROM videos").first();
          const articleCount = await env.NATALIEWINTERS_DB.prepare("SELECT COUNT(*) as count FROM articles").first();
          console.log(`Database stats - Videos: ${videoCount?.count || 0}, Articles: ${articleCount?.count || 0}`);
        } catch (statsError) {
          console.error("Error getting table stats:", statsError);
        }
      } catch (dbError) {
        console.error("D1 connection error:", dbError);
        return errorResponse("Database connection error: " + dbError.message, 500);
      }

      // Search endpoint
      if (url.pathname === '/api/search') {
        const query = url.searchParams.get('q');
        const type = url.searchParams.get('type');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(
          parseInt(url.searchParams.get('limit') || String(PAGINATION.defaultLimit)),
          PAGINATION.maxLimit
        );
        
        console.log(`Search request - query: "${query}", type: ${type}, page: ${page}, limit: ${limit}`);
        
        if (!query) {
          return new Response(JSON.stringify({
            results: [],
            pagination: {
              total: 0,
              page,
              limit,
              totalPages: 0
            },
            query: ''
          }), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        }

        try {
          const results = await searchData(env, query, { type, page, limit });
          console.log(`Search results count: ${results.results.length}`);
          
          // Log first few results for debugging
          if (results.results.length > 0) {
            console.log("Sample results:", JSON.stringify(results.results.slice(0, 2)));
          }
          
          return new Response(JSON.stringify(results), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders
            }
          });
        } catch (searchError) {
          console.error("Search error:", searchError);
          return errorResponse("Search failed: " + searchError.message, 500);
        }
      }

      // Data endpoint
      if (routes.data.test(url)) {
        const type = url.searchParams.get('type');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = Math.min(
          parseInt(url.searchParams.get('limit') || String(PAGINATION.defaultLimit)),
          PAGINATION.maxLimit
        );
        
        console.log(`Data request - type: ${type}, page: ${page}, limit: ${limit}`);
        
        if (!type) {
          return errorResponse('Data type is required');
        }
        
        try {
          const data = await getData(env, { page, limit });
          console.log(`Data results count: ${data.results.length}`);
          return jsonResponse(data);
        } catch (error) {
          console.error("Data error:", error);
          return errorResponse(error.message);
        }
      }

      // Default 404 response
      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(`Server error: ${error.message}`, { status: 500 });
    }
  }
};
