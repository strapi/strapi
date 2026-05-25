# @strapi/plugin-spaces

Virtual multi-tenancy for Strapi: one deployment, many isolated **Spaces**, sharing one database and one admin shell.

> **Phase 1 vertical slice** — header-based space resolution, document-service filtering, lifecycle stamping, one opt-in content type in `examples/getstarted`. Admin UI, subdomain routing, role scoping, CTB toggle, `config/spaces.ts` sync, components inheritance, releases/workflows/files compat and CLI commands are deferred to follow-up slices. See `spaces-design.html` at the repo root for the full design.

## Quick start

1. Enable the plugin in your Strapi project:

   ```js
   // config/plugins.js
   module.exports = {
     spaces: { enabled: true },
   };
   ```

2. Opt a content type into space scope:

   ```json
   // src/api/article/content-types/article/schema.json
   {
     "options": { "multiTenancy": { "scope": "space" } }
   }
   ```

3. Restart Strapi. A `space_id` column is added to the article table and the `default` and `acme` spaces are seeded.

4. Test isolation:

   ```bash
   # Create an article in the default space
   curl -X POST http://localhost:1337/api/articles \
     -H "X-Strapi-Space-Id: default" \
     -d '{"data":{"title":"Hello from default"}}'

   # Verify it's visible in default
   curl -H "X-Strapi-Space-Id: default" http://localhost:1337/api/articles

   # Verify it's invisible from acme
   curl -H "X-Strapi-Space-Id: acme" http://localhost:1337/api/articles
   ```

## Architecture

Mirrors `@strapi/i18n`: the `space` dimension is injected into `params.lookup` by a document-service middleware, which the query transform layer merges into the SQL `WHERE` clause. See `spaces-design.html` §3 (Architecture) and §5 (Request lifecycle).
