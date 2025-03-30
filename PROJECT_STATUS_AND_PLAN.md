# Project Status and Plan: Business Directory

**Date:** March 30, 2025 

## 1. Project Goal

To create a dynamic web application serving as a business directory, featuring content like articles and videos. Key functionality includes searching across content types, displaying results, and potentially filtering. The project involves migrating from Cloudflare KV to Cloudflare D1 for database storage and implementing a user-friendly frontend.

## 2. Current Setup

This section details the configuration and components as they currently exist.

### 2.1. Technology Stack

*   **Frontend Hosting:** Cloudflare Pages
*   **Backend API:** Cloudflare Workers
*   **Database:** Cloudflare D1 (Primary)
*   **Previous Datastore:** Cloudflare KV (Bindings may still exist but are likely unused for primary data)
*   **Languages/Frameworks:** HTML, CSS, JavaScript (Frontend), Node.js (Worker Runtime, Build Scripts)

### 2.2. Project Structure (Key Files/Dirs)

*   `~/this/`: Project root directory.
*   `~/this/public/`: Contains all static frontend assets (HTML, CSS, JS, Images).
    *   `index.html`, `articles.html`, `videos.html`, `businesses.html`, `contact.html`: Main site pages.
    *   `styles.css`: Contains all CSS rules (light pink theme, hero styles, layout).
    *   `search.js`: Handles search API calls, lazy loading/infinite scroll, DOM manipulation for results.
    *   `images/hero/`: Contains hero background images (`wintersinvite.png`, `natalie-winters-hero.png`).
    *   `data/`: Contains original JSON data sources.
*   `~/this/worker.js`: Cloudflare Worker script handling API requests.
*   `~/this/wrangler.toml`: Configuration file for Cloudflare Wrangler CLI.
*   `~/this/create-articles.sql`, `~/this/create-videos.sql`: SQL scripts defining D1 table schemas.
*   `~/this/transform-data.js`: Node.js script to process source JSONs into D1-compatible format.
*   `~/this/import-to-d1.js`: Node.js script for batch importing transformed data into D1.
*   `~/this/d1-import-articles.json`, `~/this/d1-import-videos.json`: Transformed data ready for import.
*   `~/this/.wrangler/`: Directory containing local development state, including the local D1 SQLite DB.

### 2.3. Cloudflare Configuration (`wrangler.toml`)

```toml
name = "business-directory"
main = "worker.js"
compatibility_date = "2023-03-29"

[[kv_namespaces]]
binding = "DIRECTORY_DATA"
id = "42c56c003c454a42a03f1b1fdaa8313f"

[[kv_namespaces]]
binding = "SEARCH_DATA"
id = "20ff47dc6f3549d189a7691f0e150b94"

[[d1_databases]]
binding = "NATALIEWINTERS_DB" # Env var name in worker.js
database_name = "nataliewinters-db" # DB name in Cloudflare dashboard
database_id = "67d2b960-fbe6-4451-b837-f88de68d2036"

[observability]
[observability.logs]
enabled = true

[site]
bucket = "./public" # Serves static files from 'public' directory
```

### 2.4. Cloudflare Pages Setup

*   **Project Name:** `business-directory-site`
*   **Deployment Mode:** Direct Upload (Inferred - No Git connection mentioned, `wrangler pages deploy` updates live site).
*   **Production Domains:** 
    *   `business-directory-site.pages.dev` (Default)
    *   `test.nataliegwinters.com` (Custom Domain)
*   **Build Configuration:** None (Serves static files directly from `public`).
*   **Connected Worker:** The `business-directory` worker is implicitly connected via routing/bindings.

### 2.5. Database (`nataliewinters-db` - Remote D1)

*   **Tables:** `articles`, `videos` (Primary). Other tables like `_cf_KV`, `d1_migrations`, `users`, `tags`, etc., exist from previous states or default setups but are not actively used by the current core functionality.
*   **Schema Source:** Defined by `create-articles.sql` and `create-videos.sql`. Tables were recently recreated to match these schemas.
*   **Current State:** Partially populated due to import script failures.
    *   `articles`: 458 records (Full import successful).
    *   `videos`: 3850 records (Partial import, failed during batch execution).

### 2.6. Data Pipeline

1.  **Source:** Raw data resides in JSON files within `public/data/`.
2.  **Transform:** `transform-data.js` reads source JSONs, combines video sources, maps fields (e.g., `excerpt` to `description`), generates unique IDs (currently counter-based for videos), and writes `d1-import-articles.json` and `d1-import-videos.json`.
3.  **Import:** `import-to-d1.js` reads the transformed JSONs and executes batch `INSERT` statements against the D1 database using `npx wrangler d1 execute --file=... --remote`. Configured with `BATCH_SIZE = 25`. Currently modified to skip video import.

### 2.7. Frontend (`public` directory)

*   **Layout:** Consistent header (logo, nav links: Home, Articles, Videos, Businesses, Contact), footer (nav links, copyright), and hero section across all pages. Mobile responsive menu implemented. Light pink theme applied via CSS variables.
*   **Hero:** Uses `natalie-winters-hero.png` background, positioned `center top`. Text (`<h1>`) is positioned near the bottom with a semi-transparent dark background box for readability.
*   **Content Pages:** `articles.html`, `videos.html`, `businesses.html` display page title in hero, search bar, and results grid (`#resultsGrid`).
*   **Functionality (`search.js`):**
    *   Attaches listeners to search input (`#searchInput`) and button (`#searchButton`).
    *   Handles search execution via `handleSearch` function.
    *   Calls worker endpoint (`/api/search`) with query, page, limit, and automatically determined `type` based on the current HTML page path.
    *   Implements **lazy loading (infinite scroll):** Fetches next page of results when user scrolls near the bottom. Appends new results to `#resultsGrid`. Removes need for pagination controls.
    *   Displays loading indicators and handles basic errors.
    *   Includes menu toggle and active navigation link highlighting logic.

### 2.8. Backend API (`worker.js`)

*   **Routing:** Handles requests to `/api/search` and `/api/data`. Other requests are expected to be handled by Pages static asset serving.
*   **`/api/data`:** Fetches records directly from D1 (`env.NATALIEWINTERS_DB`) based on `type`, `page`, `limit` parameters. Used for initial content loading? (Currently `search.js` primarily uses `/api/search`).
*   **`/api/search`:** Performs `LIKE` queries against `title` and `description` columns in `articles` and `videos` tables in D1 based on query (`q`), `page`, `limit`, and optional `type` parameters. Returns results and pagination metadata.
*   **Bindings:** Configured via `wrangler.toml` to access D1 database `NATALIEWINTERS_DB`.
*   **CORS:** Includes permissive CORS headers (`Access-Control-Allow-Origin: *`).

### 2.9. Current Deployment Workflow

*   **Worker:** Changes to `worker.js` or `wrangler.toml` require `npx wrangler deploy`, which updates the single live worker instance immediately.
*   **Frontend:** Changes to files in `./public` require `npx wrangler pages deploy public --project-name=business-directory-site`. In the current Direct Upload mode, this updates the live production site directly (after cache propagation). There is no separate "staging" or manual "promote" step for the frontend.

### 2.10. Local Development State

*   Previously used Python `http.server` for static file preview (now stopped).
*   Attempts to use `npx wrangler dev` encountered issues serving the root `/` path, requiring explicit navigation to `/index.html`. The underlying cause seems to be a quirk in how `wrangler dev` handles the interaction between `[site]` configuration and the worker\'s fetch handler for the root path. Local D1 database is separate and likely empty unless explicitly populated.

## 3. Challenges with Current Setup

*   **Deployment Risk:** Deploying frontend changes directly to production via `wrangler pages deploy` bypasses a dedicated preview/testing phase, increasing the risk of pushing broken code live.
*   **Local Development Limitations:** The current local setup (`wrangler dev`) isn\'t fully mirroring production behaviour (root path issue), making local testing less reliable. The local database requires separate population, and secrets management isn\'t formalized.
*   **Data Import Flakiness:** The current batch import script (`import-to-d1.js`) using repeated `wrangler d1 execute --remote` commands has proven unreliable for the large video dataset, failing intermittently with `fetch failed` errors. This has resulted in a partially populated production database.

## 4. Proposed Plan: Robust Local Environment & Workflow

### 4.1. Goal

Establish a reliable and safe local development environment that closely mimics production, allowing for testing of frontend, worker, and database interactions without affecting the live site. Formalize secrets management and potentially adopt a safer deployment workflow later.

### 4.2. Local Environment Setup

1.  **Primary Tool:** Use `npx wrangler dev` for running the local worker and serving static files.
2.  **Local Database:** Utilize the default local SQLite D1 database (`.wrangler/state/v3/d1/.../db.sqlite`) provided by `wrangler dev`. This isolates local data changes.
3.  **Populating Local D1:**
    *   Ensure the `import-to-d1.js` script **does not** use the `--remote` flag in its `execSync` calls.
    *   Run `node import-to-d1.js` whenever the local database needs to be populated or refreshed. (Note: Clearing the local DB might require deleting `.wrangler/state/v3/d1/.../db.sqlite` or the parent directory).
4.  **Database Inspection:** Install and use a standard SQLite GUI tool (e.g., DB Browser for SQLite, DBeaver, Beekeeper Studio) to open, inspect, query, and debug the local `.wrangler/state/v3/d1/.../db.sqlite` file directly.
5.  **Secrets Management:**
    *   **`.gitignore`:** Create/ensure a comprehensive `.gitignore` file (see section 4.4).
    *   **Production Secrets:** Use `npx wrangler secret put SECRET_NAME` to securely store production secrets needed by `worker.js` in Cloudflare.
    *   **Local Secrets (`.dev.vars`):** Create a file named `.dev.vars` in the project root (`~/this`). Add development/local values for secrets here (e.g., `API_KEY=\"dummy_local_key\"`). **Crucially, add `.dev.vars` to your `.gitignore` file.** `wrangler dev` will automatically load variables from this file into the worker\'s `env` object locally.
    *   **Worker Code:** Access secrets in `worker.js` via the `env` object (e.g., `env.SECRET_NAME`).
    *   **Frontend Secrets:** Avoid storing sensitive keys in `search.js`. Have the frontend call the worker API, and let the worker use its secure `env` variables to interact with protected resources.
6.  **Git Repository (Recommended but Optional for Now):** Initialize a Git repository locally (`git init`, `git add .`, `git commit -m \"Initial commit\"`) even if not pushing to GitHub yet. This helps track changes and works well with `.gitignore`.

### 4.3. Proposed Local Development Workflow

1.  Make code changes (frontend in `public`, backend in `worker.js`, database schema in `*.sql`, etc.).
2.  If database schema or data requirements change, update relevant files (`*.sql`, `transform-data.js`) and optionally repopulate the *local* D1 database using `node import-to-d1.js` (without `--remote`).
3.  Run `npx wrangler dev`. Ensure your `.dev.vars` file exists if local secrets are needed.
4.  Open `http://localhost:8787/index.html` (or other specific `.html` files) in the browser.
5.  Test all functionality: UI, lazy loading, API interactions, form submissions. Check the browser console and the `wrangler dev` terminal output for errors.
6.  Use SQLite tools to inspect the local database state if needed.
7.  Repeat steps 1-6 until features/fixes are complete locally.
8.  Commit changes to Git (if using).

### 4.4. Proposed `.gitignore` Content

Create/update a file named `.gitignore` in the project root (`~/this`) with the following content:

```gitignore
# Node
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json # Optional, depending on team workflow

# Wrangler / Cloudflare
.wrangler/
*.db
*.sqlite
*.sqlite-journal
.dev.vars # VERY IMPORTANT for local secrets

# OS generated files
.DS_Store
Thumbs.db

# Logs
*.log
import_log.txt # Our import log

# Temporary SQL files from import script
insert-*-batch-*.sql

# IDE specific
.vscode/
```

### 4.5. Proposed Deployment Workflow (Maintaining Direct Upload for Now)

1.  **Secrets Check:** Ensure all necessary production secrets are set in the Cloudflare dashboard via `Settings` -> `Variables` for the Worker, or using `npx wrangler secret put SECRET_NAME`.
2.  **Worker Deployment:** If `worker.js` or `wrangler.toml` changed, run `npx wrangler deploy`.
3.  **Frontend Deployment:** Run `npx wrangler pages deploy public --project-name=business-directory-site`.
4.  **Verification:**
    *   Go to the Cloudflare Dashboard -> Workers & Pages -> `business-directory-site` -> Deployments.
    *   Find the latest deployment (top of the list).
    *   Click "View details" or similar to find the **unique deployment URL** (e.g., `https://<hash>.business-directory-site.pages.dev`).
    *   **Test this unique URL thoroughly.** This is your best "preview" in the direct upload model, showing the result of the deployment in the real Cloudflare environment *before* caches fully update globally for the main domain.
5.  **Wait & Confirm:** Allow time (minutes) for cache propagation. Verify the changes are live on the main production domain(s) (`test.nataliegwinters.com`, `business-directory-site.pages.dev`).

### 4.6. Future Enhancement: Git Integration

For a true preview/staging workflow with manual promotion, the recommended next step after stabilizing the local environment would be:
1.  Push the local Git repository to GitHub/GitLab.
2.  Connect the Cloudflare Pages project (`business-directory-site`) to the Git repository.
3.  Configure `main` as the production branch.
4.  Develop on other branches (e.g., `develop`). Pushing these branches creates automatic previews.
5.  Merge `develop` into `main` to trigger production deployments.

This report should provide a solid snapshot and guide for refreshing the chat and continuing development.