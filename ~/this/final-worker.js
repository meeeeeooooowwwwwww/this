addEventListener("fetch", e => { e.respondWith(handleRequest(e.request)); });

async function handleRequest(request) {
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const url = new URL(request.url);
  
  if (url.pathname === "/api/data/businesses") {
    try {
      const data = await DIRECTORY_DATA.get("businesses");
      return new Response(data || "[]", { headers });
    } catch (e) {
      return new Response(JSON.stringify({error: e.message}), {status: 500, headers});
    }
  }
  
  if (url.pathname === "/api/data/categories") {
    try {
      const data = await DIRECTORY_DATA.get("categories");
      return new Response(data || "[]", { headers });
    } catch (e) {
      return new Response(JSON.stringify({error: e.message}), {status: 500, headers});
    }
  }
  
  return new Response(JSON.stringify({
    message: "API endpoints available: /api/data/businesses, /api/data/categories"
  }), { headers });
} 