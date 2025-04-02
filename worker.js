/**
 * Business Directory - Search Worker
 *
 * This Cloudflare Worker provides:
 * 1. A search API endpoint
 * 2. Data retrieval endpoints for categories and businesses
 * 3. Video data retrieval for Natalie Winters videos
 */

const SITEMAP_URL_LIMIT = 50000; // Max URLs per sitemap file

// Define the routes for the Worker
const routes = {
  search: new URLPattern({ pathname: '/api/search' }),
  videos: new URLPattern({ pathname: '/api/videos/:collection' }),
  video: new URLPattern({ pathname: '/api/video/:id' }),
  data: new URLPattern({ pathname: '/api/data' }),
  productPage: new URLPattern({ pathname: '/product/:id' }),
  productSitemapPage: new URLPattern({ pathname: '/sitemap-products-:page(\\d+).xml' }),
  sitemapIndex: new URLPattern({ pathname: '/sitemap_index.xml' }),
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
          id, title, link, thumbnail, platform, source_type, 'video' as type
        FROM videos 
        WHERE 
          LOWER(title) LIKE ?
        LIMIT ? OFFSET ?
      `;
      
      try {
        // Execute the query
        const videosData = await env.NATALIEWINTERS_DB.prepare(sqlQuery)
          .bind(searchTerm, limit, offset)
          .all();
        
        if (videosData.results) {
          results.push(...videosData.results);
        }
  
        // Get total count for pagination
        const videoCountData = await env.NATALIEWINTERS_DB.prepare(`
          SELECT COUNT(*) as count FROM videos 
          WHERE LOWER(title) LIKE ?
        `)
          .bind(searchTerm)
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
            id, title, link, thumbnail, publish_date, relative_time, platform, source_type, 'video' as type
          FROM videos
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        countQuery = `SELECT COUNT(*) as count FROM videos`;
        console.log('[getData - Videos] SQL Query:', sqlQuery);
        console.log('[getData - Videos] Limit:', limit, 'Offset:', offset);
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

      // Sitemap Index
      let match = routes.sitemapIndex.exec(url);
      if (match) {
        return handleSitemapIndex(request, env);
      }

      // Individual Product Sitemap Page
      match = routes.productSitemapPage.exec(url);
      if (match) {
        const page = parseInt(match.pathname.groups.page, 10);
        return handleProductSitemapPage(request, env, page);
      }

      // Product Page
      match = routes.productPage.exec(url);
      if (match) {
        const productId = match.pathname.groups.id;
        return handleProductPage(request, env, productId);
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
          const data = await getData(env, { type, page, limit });
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

// Function to handle individual product pages
async function handleProductPage(request, env, productId) {
  if (!productId) {
    return errorResponse('Product ID missing', 400);
  }

  try {
    const stmt = env.NATALIEWINTERS_DB.prepare(
      `SELECT id, title, description, image_link, price, brand, link
       FROM products
       WHERE id = ?1`
    ).bind(productId);

    const { results } = await stmt.all();

    if (!results || results.length === 0) {
      return new Response('Product Not Found', { status: 404, headers: corsHeaders });
    }

    const product = results[0];

    // Basic HTML generation (customize as needed)
    // IMPORTANT: Replace "yourdomain.com" with your actual domain
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${escapeHtml(product.title)} - Your Site Name</title> 
        <meta name="description" content="${escapeHtml(product.description?.substring(0, 160) || 'View product details.')}">
        <!-- Add links to CSS, favicons, etc. -->
        <link rel="stylesheet" href="/styles.css"> 
      </head>
      <body>
        <header>
          <!-- Add site navigation if needed -->
        </header>
        <main>
          <h1>${escapeHtml(product.title)}</h1>
          <p><strong>Brand:</strong> ${escapeHtml(product.brand || 'N/A')}</p>
          <p><strong>Price:</strong> ${escapeHtml(product.price || 'N/A')}</p>
          ${product.image_link ? `<img src="${escapeHtml(product.image_link)}" alt="${escapeHtml(product.title)}" style="max-width: 300px; height: auto;">` : ''}
          <h2>Description</h2>
          <p>${escapeHtml(product.description || 'No description available.')}</p>
          <p><a href="${escapeHtml(product.link)}" target="_blank" rel="noopener noreferrer sponsored">View or Buy Product Here</a></p>
          <!-- Add more product details, related products, etc. -->
        </main>
        <footer>
          <!-- Add footer content -->
        </footer>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html;charset=UTF-8', ...corsHeaders }
    });

  } catch (e) {
    console.error(`Error fetching product ${productId}:`, e);
    return errorResponse('Server error fetching product', 500);
  }
}

// Function to generate specific product sitemap page
async function handleProductSitemapPage(request, env, page) {
  page = Math.max(1, page); // Ensure page is at least 1
  const offset = (page - 1) * SITEMAP_URL_LIMIT;

  try {
    const stmt = env.NATALIEWINTERS_DB.prepare(
       `SELECT id FROM products ORDER BY id LIMIT ?1 OFFSET ?2`
    ).bind(SITEMAP_URL_LIMIT, offset);
    const { results } = await stmt.all();

    if (!results || results.length === 0) {
      // Return 404 if page number is too high / no results
      return new Response('Sitemap page not found or empty', { status: 404, headers: corsHeaders });
    }

    const baseUrl = "https://nataliegwinters.com";

    const urlset = results.map(p =>
      `<url><loc>${baseUrl}/product/${escapeHtml(p.id)}</loc></url>`
    ).join('\n');

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`;

    return new Response(sitemapXml, {
       headers: { 'Content-Type': 'application/xml;charset=UTF-8', ...corsHeaders }
    });

   } catch (e) {
     console.error(`Error generating sitemap page ${page}:`, e);
     return errorResponse('Server error generating sitemap page', 500);
   }
}

// Function to generate the sitemap index file
async function handleSitemapIndex(request, env) {
    try {
        // 1. Count total products
        const countStmt = env.NATALIEWINTERS_DB.prepare(
            `SELECT COUNT(*) as total FROM products`
        );
        const countResult = await countStmt.first();
        const totalProducts = countResult?.total || 0;

        if (totalProducts === 0) {
             return new Response('No products found for sitemap index', { status: 404, headers: corsHeaders });
        }

        // 2. Calculate number of pages needed
        const totalPages = Math.ceil(totalProducts / SITEMAP_URL_LIMIT);

        // 3. Generate sitemap index entries
        const baseUrl = "https://nataliegwinters.com";
        let sitemapEntries = '';
        for (let i = 1; i <= totalPages; i++) {
            // We can add a lastmod date if desired, but keeping it simple for now
            sitemapEntries += `<sitemap><loc>${baseUrl}/sitemap-products-${i}.xml</loc></sitemap>\n`;
        }

        // 4. Construct the index XML
        const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;

        return new Response(sitemapIndexXml, {
            headers: { 'Content-Type': 'application/xml;charset=UTF-8', ...corsHeaders }
        });

    } catch (e) {
        console.error("Error generating sitemap index:", e);
        return errorResponse('Server error generating sitemap index', 500);
    }
}

// Simple HTML escaping function
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }
