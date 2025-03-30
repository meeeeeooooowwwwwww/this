/**
 * Business Directory - Search Worker
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Handle search requests
  if (pathname === '/api/search') {
    // Get search query from URL
    const query = url.searchParams.get('q');
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing search query' }),
        { status: 400, headers }
      );
    }
    
    try {
      // Get all businesses from KV store
      const businessesJson = await DIRECTORY_DATA.get('businesses');
      
      if (!businessesJson) {
        return new Response(
          JSON.stringify({ error: 'No business data found' }),
          { status: 404, headers }
        );
      }
      
      const businesses = JSON.parse(businessesJson);
      
      // Filter businesses based on search query
      const results = businesses.filter(business => {
        const titleMatch = business.title.toLowerCase().includes(query.toLowerCase());
        const descMatch = business.description?.toLowerCase().includes(query.toLowerCase());
        const categoryMatch = business.category?.toLowerCase().includes(query.toLowerCase());
        
        return titleMatch || descMatch || categoryMatch;
      });
      
      return new Response(
        JSON.stringify(results),
        { headers }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: 'Error performing search: ' + error.message }),
        { status: 500, headers }
      );
    }
  }
  
  // Handle data retrieval requests
  if (pathname.startsWith('/api/data/')) {
    const type = pathname.split('/').pop();
    
    if (!type || (type !== 'businesses' && type !== 'categories')) {
      return new Response(
        JSON.stringify({ error: 'Invalid data type' }),
        { status: 400, headers }
      );
    }
    
    try {
      const dataJson = await DIRECTORY_DATA.get(type);
      
      if (!dataJson) {
        return new Response(
          JSON.stringify({ error: `No ${type} data found` }),
          { status: 404, headers }
        );
      }
      
      return new Response(
        dataJson,
        { headers }
      );
    } catch (error) {
      return new Response(
        JSON.stringify({ error: `Error retrieving ${type}: ` + error.message }),
        { status: 500, headers }
      );
    }
  }
  
  // Return 404 for unmatched routes
  return new Response(
    JSON.stringify({ error: 'Not found', path: pathname }),
    { status: 404, headers }
  );
} 