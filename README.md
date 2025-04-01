# Natalie G Winters Website

This repository contains the source code for the Natalie G Winters website, deployed on Cloudflare Pages and powered by a Cloudflare Worker API connected to a Cloudflare D1 database.

## Project Structure

```
./
├── public/               # Static frontend assets (HTML, CSS, JS, Images)
├── worker.js             # Cloudflare Worker API script
├── worker.live.backup.js # Backup of previously deployed worker
├── wrangler.toml         # Cloudflare configuration (Workers, Pages, D1, KV)
├── package.json          # Node.js dependencies and scripts
├── package-lock.json     # Lockfile for dependencies
├── .gitignore            # Files/directories ignored by Git
├── .dev.vars             # Local development environment variables (KEEP SECRET!)
├── project_backup/       # Project backups (ZIP files, notes)
├── deleted/              # Temporarily moved files during cleanup
└── README.md             # This file
```

## Data Management

**Important:** All data transformation, import, and update processes (including product feeds, articles, etc.) are now handled in a separate private repository named `updates`. This repository (`this`) only contains the frontend code, the Cloudflare Worker API, and the necessary configuration for deployment. It consumes the data prepared by the `updates` repository via the D1 database.

## Technology Stack

*   **Frontend:** HTML, CSS, JavaScript (served by Cloudflare Pages)
*   **Backend API:** Cloudflare Workers
*   **Database:** Cloudflare D1
*   **Deployment:** Cloudflare Wrangler CLI

## Cloudflare Setup

This project requires the following Cloudflare resources configured in `wrangler.toml`:

*   **D1 Database:** `nataliewinters-db` (Binding: `NATALIEWINTERS_DB`)
*   **KV Namespaces:** (Bindings: `DIRECTORY_DATA`, `SEARCH_DATA`) - *Note: Current usage unclear, might be legacy.*
*   **Cloudflare Pages Projects:**
    *   Development: `natalie-winters-dev` (Linked to `test.nataliegwinters.com`)
    *   Production: `natalie-winters-prod` (Linked to `nataliegwinters.com`)
*   **Cloudflare Worker:** `business-directory` (Used by both environments for now)

## Git Branching Strategy

*   `development`: Main branch for ongoing development and testing.
*   `production`: Stable branch reflecting the code deployed to the live site (`nataliegwinters.com`). Changes are merged from `development` only when ready for release.

## Deployment Workflow

**🚨 CRITICAL WARNING 🚨**

**NEVER deploy directly to the PRODUCTION Pages project (`natalie-winters-prod-this`) from your local machine using a simple `npx wrangler pages deploy ...` command.** This bypasses the standard Git workflow and can easily push unfinished or broken code from your development branch (`development`) to the live website.

**ALWAYS follow the Production Deployment steps below, which involve merging tested code from `development` into the `production` branch FIRST, and then deploying the `production` branch.**

**Important:** Ensure you have installed Node.js, npm, and the Wrangler CLI (`npm install -g wrangler`). Run `npm install` in the project root to install local dependencies.

### 1. Development Deployment (to `natalie-g-winters-dev-this.pages.dev`)

This deploys the latest code from your **current local branch** (usually `development`) to the development Pages site. Use this frequently for testing.

```bash
# Ensure you are on the correct branch (e.g., development)
# git checkout development

# Deploy Worker (only if worker.js has changed)
# npx wrangler deploy

# Deploy Pages to the development project
npx wrangler pages deploy public --project-name=natalie-g-winters-dev-this
```

### 2. Production Deployment (to `nataliegwinters.com`)

**Only deploy when changes are tested and ready for the live site.**

```bash
# 1. Ensure your local 'development' branch is up-to-date
git checkout development
git pull origin development # Or your remote name

# 2. Switch to the production branch
git checkout production

# 3. Pull the latest production code (if collaborating)
# git pull origin production

# 4. Merge tested changes from 'development' into 'production'
git merge development
# --- Resolve any merge conflicts if they occur --- #

# 5. Push the merge to the remote production branch (optional but good practice)
# git push origin production

# 6. Deploy Worker for production (only if worker.js changed in the merge)
# npx wrangler deploy --env production

# 7. Deploy Pages to the production project, linking the production branch
npx wrangler pages deploy public --project-name=YOUR_PRODUCTION_PROJECT_NAME --branch=production
```

**Notes:**
*   The `--env production` flag is generally *not required* for `pages deploy` when the `[env.production.site]` section exists in `wrangler.toml`, but explicitly specifying `--project-name` and `--branch` is crucial.
*   Always ensure the correct Cloudflare Pages project names (`natalie-g-winters-dev-this`, `YOUR_PRODUCTION_PROJECT_NAME`) are used.
*   Remember to remove the redirect rule from `nataliegwinters.com` in the Cloudflare dashboard.

## Local Development

Run the local development server:

```bash
npx wrangler dev
```

**Important:** `wrangler dev` uses a **local simulation** of D1 and KV by default. It does **not** connect to your remote database unless specifically configured to do so (advanced). Use remote testing (deployment to `test.nataliegwinters.com`) for accurate data interaction tests.

## Recent Changes (April 2, 2025 Session)

*   Updated README to reflect that data processing occurs in the separate `updates` repo.
*   Created `data-processing/` directory (subsequently added to `.gitignore`).
*   Created script `data-processing/generate-article-sql.js` to generate SQL inserts from JSON (ignored via `.gitignore`).
*   Troubleshot Cloudflare authentication issues (switched from API token env var to OAuth/browser login).
*   Attempted to import sample data into remote dev D1 DB using `wrangler d1 execute` (deferred).
*   Added affiliate banner to footer.
*   Adjusted logo font size for mobile viewports.
*   Adjusted footer banner styling for layout consistency.
*   Renamed `[env.development]` to `[env.preview]` in `wrangler.toml` for Cloudflare Pages compatibility.
*   Resolved Git branch state issues after reverting `development` branch.
*   Pushed final footer banner changes to `development` and `production` branches. 