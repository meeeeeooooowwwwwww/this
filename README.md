# Natalie G Winters Website

This repository contains the source code for the Natalie G Winters website, deployed on Cloudflare Pages and powered by a Cloudflare Worker API connected to a Cloudflare D1 database.

## Project Structure

```
./
├── public/               # Static frontend assets (HTML, CSS, JS, Images)
├── scripts/              # Node.js scripts for data transformation, import, etc.
├── sql_scripts/          # SQL schema and query files for D1
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

*   `develop`: Main branch for ongoing development and testing.
*   `production`: Stable branch reflecting the code deployed to the live site (`nataliegwinters.com`). Changes are merged from `develop` only when ready for release.

## Deployment Workflow

**Important:** Ensure you have installed Node.js, npm, and the Wrangler CLI (`npm install -g wrangler`). Run `npm install` in the project root to install local dependencies.

### 1. Development Deployment (to `test.nataliegwinters.com`)

This deploys the latest code from your **current local branch** (usually `develop`) to the development Pages site.

```bash
# Ensure you are on the correct branch (e.g., develop)
# git checkout develop

# Deploy Worker (only if worker.js has changed)
# npx wrangler deploy

# Deploy Pages to the development project
npx wrangler pages deploy public --project-name=natalie-winters-dev
```

### 2. Production Deployment (to `nataliegwinters.com`)

**Only deploy when changes are tested and ready for the live site.**

```bash
# 1. Ensure your local 'develop' branch is up-to-date
git checkout develop
git pull origin develop # Or your remote name

# 2. Switch to the production branch
git checkout production

# 3. Pull the latest production code (if collaborating)
# git pull origin production

# 4. Merge tested changes from 'develop' into 'production'
git merge develop
# --- Resolve any merge conflicts if they occur --- #

# 5. Push the merge to the remote production branch (optional but good practice)
# git push origin production

# 6. Deploy Worker for production (only if worker.js changed in the merge)
# npx wrangler deploy --env production

# 7. Deploy Pages to the production project, linking the production branch
npx wrangler pages deploy public --project-name=natalie-winters-prod --branch=production
```

**Notes:**
*   The `--env production` flag is generally *not required* for `pages deploy` when the `[env.production.site]` section exists in `wrangler.toml`, but explicitly specifying `--project-name` and `--branch` is crucial.
*   Always ensure the correct Cloudflare Pages project names (`natalie-winters-dev`, `natalie-winters-prod`) are used.
*   Remember to remove the redirect rule from `nataliegwinters.com` in the Cloudflare dashboard.

## Local Development

Run the local development server:

```bash
npx wrangler dev
```

**Important:** `wrangler dev` uses a **local simulation** of D1 and KV by default. It does **not** connect to your remote database unless specifically configured to do so (advanced). Use remote testing (deployment to `test.nataliegwinters.com`) for accurate data interaction tests. 