# Business Directory Website

A modern business directory website with search functionality powered by Cloudflare Workers and KV Storage.

## Features

- 🔍 Real-time search using Cloudflare Workers
- 📊 Categories and business listings stored in KV Storage
- 📱 Fully responsive design for all devices
- ⚡ Fast page loads with static site hosting
- 🌐 Global CDN via Cloudflare Pages

## Project Structure

```
├── public/               # Static website files
│   ├── index.html        # Main HTML file
│   ├── styles.css        # CSS styles
│   ├── search.js         # Search functionality
│   └── app.js            # Main application logic
├── worker.js             # Cloudflare Worker for API
├── seed-data.js          # Script to populate KV storage
├── deploy.js             # Deployment script
└── wrangler.toml         # Cloudflare configuration
```

## Prerequisites

Before deploying, you need:

1. A Cloudflare account
2. Wrangler CLI installed and configured
3. Node.js and npm installed

## Configuration

1. Update your `wrangler.toml` file with your Cloudflare account ID and KV namespace ID:

```toml
name = "business-directory"
type = "webpack"
account_id = "your-account-id"
zone_id = "your-zone-id"

[site]
bucket = "./public"
entry-point = "workers-site"

[env.production]
kv_namespaces = [
  { binding = "DIRECTORY_DATA", id = "your-kv-namespace-id" }
]
```

2. Create a KV namespace for your data:

```bash
wrangler kv:namespace create "DIRECTORY_DATA"
```

Then copy the ID into your `wrangler.toml` file.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

## Deployment

You can use the deployment script to automate the process:

```bash
node deploy.js
```

Or manually deploy each component:

1. Deploy the Worker:

```bash
wrangler publish worker.js
```

2. Seed KV storage with initial data:

```bash
node seed-data.js
```

3. Deploy to Cloudflare Pages:

```bash
wrangler pages deploy ./public --project-name=business-directory
```

## Customizing Data

To modify the sample business data, edit the `seed-data.js` file and run it again to update your KV storage.

## Search Functionality

The search functionality uses the Cloudflare Worker API to query business data stored in KV. The search is performed on both business names and descriptions.

To customize the search functionality:

1. Modify the `/api/search` endpoint in `worker.js`
2. Update the `search()` function in `search.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 