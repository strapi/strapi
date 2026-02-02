# Task 1 — Strapi: local setup, Admin, and sample content

This document records the steps I followed to complete Task #1: getting Strapi running locally, creating a Blog Post content type in the Admin, adding a sample entry, verifying with the API, and preparing the work for GitHub.

---

## Summary

I set up a local Strapi instance (standalone example app inside the repository), created an Admin user, created a `Blog Post` collection type with fields, added a sample entry, and verified the API. I fixed a permissions issue that returned HTTP 403 on the public API and committed the generated schema files in a feature branch named `keshavprajapati-strapi-task1`.

## Environment

- OS: Windows (development machine)
- Node: v22.19.0
- Package manager: Yarn v4.5.0 (activated via Corepack)
- Strapi: repository (monorepo) with example app at `examples/getstarted`
- Branch used for this work: `keshavprajapati-strapi-task1`

## Commands I ran (chronological)

> Note: run these from the project root unless otherwise stated.

1. Enable Corepack and activate Yarn (if needed):

```powershell
corepack enable
corepack prepare yarn@4.5.0 --activate
```

2. Install repository dependencies (root workspace):

```powershell
yarn install
```

3. Setup and build local workspace (this runs repository setup tasks):

```powershell
yarn setup
```

4. Start the example app (the one I used for the Admin UI):

```powershell
cd examples/getstarted
yarn develop
# or npm install
# npm run develop
```

The Admin UI became available at: `http://localhost:1337/admin`.

Alternative — create a standalone Strapi project with NPX (recommended if you prefer a separate project):

```powershell
npx create-strapi@latest my-strapi-task1 --quickstart

# if preferred the interactive flow:
npx create-strapi@latest my-strapi-task1

cd my-strapi-task1
npm run develop
# or: yarn develop
```

## Admin workflow I followed

1. Opened `http://localhost:1337/admin` and completed the **Create an administrator** flow.
2. Navigated to **Content-type Builder** → **Create collection type**.
3. Created a collection type with the following fields (internal name `blog-post`):
   - `title` — Text (Single line)
   - `content` — Rich Text
   - `published` — Boolean
   - `publishedAt` — Date
   - `featured_image` — Media (optional)
4. Clicked **Save** and waited for the server/admin rebuild to finish.
5. Went to **Content Manager** → **Blog Post** → **Create new entry**, filled fields and saved/published the post.

## API verification

- Initially, a simple curl returned a `403 Forbidden` because the Public role did not have read permissions:

```bash
curl http://localhost:1337/api/blog-posts
# {"data":null,"error":{"status":403,"name":"ForbiddenError","message":"Forbidden","details":{}}}
```

- To fix, I allowed the Public role `find` and `findOne` for the Blog Post content type in Admin → Settings → Roles & Permissions → Public → Collection Types.

- After permitting, I verified with curl:

```bash
curl http://localhost:1337/api/blog-posts
# Returns the JSON list of posts
```

- Alternatively, you can create a read-only API token (Admin → Settings → API Tokens) and call the API with the token:

```bash
curl -H "Authorization: Bearer <TOKEN>" http://localhost:1337/api/blog-posts
```

## Files changed / where schema lives

When creating a collection type through the Admin, Strapi generates files under the app directory. For this example app the primary locations are:

- `examples/getstarted/src/api/blog-post/content-types/blog-post/schema.json` (content type schema)
- `examples/getstarted/src/api/blog-post/routes/*` (if routes were generated/changed)
- The content is stored in the local development database (SQLite in Quickstart), not as a source file.

## Git workflow I used

I created a feature branch and committed the generated content-type files:

```bash
git checkout -b keshavprajapati-strapi-task1
git add .
git commit -m "feat: add Sample content type (Blog Post) and sample entry"
git push -u origin keshavprajapati-strapi-task1

## Recording and documentation deliverables
- I recorded a short screen recording showing: start server, create admin user, create Blog Post content type, add entry, and verify API response.
- Loom link: https://www.loom.com/share/f6ae7a33dba84e8e94b59e012dccaeda
```
