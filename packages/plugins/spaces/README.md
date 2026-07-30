# @strapi/plugin-spaces

Virtual multi-tenancy for Strapi: one deployment, many isolated **Spaces**, sharing one database and one admin shell.

> **Phases 1–3 built** — header-based space resolution, document-service filtering, lifecycle stamping, settings-visibility pattern (i18n locales), and the admin UX (nav workspace switcher + creation modal, Settings → Workspaces management page, move actions, CTB "Workspaces" checkbox dropdown). Role scoping, subdomain routing, `config/spaces.ts` sync, components inheritance, releases/workflows/files compat and CLI commands are deferred to follow-up slices. See [`docs/design.html`](docs/design.html) for the full design.

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
     "pluginOptions": { "spaces": { "scope": "space" } }
   }
   ```

   Optionally restrict which spaces the content type appears in (empty or missing =
   visible everywhere):

   ```json
   {
     "pluginOptions": { "spaces": { "scope": "space", "visibleIn": ["acme"] } }
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

Mirrors `@strapi/i18n`: the `space` dimension is injected into `params.filters` by a document-service middleware, which the query transform layer merges into the SQL `WHERE` clause. (`params.lookup` — the path i18n uses — is reserved for core transforms; `validateParams` rejects third-party lookup keys.) See [`docs/design.html`](docs/design.html) §3 (Architecture) and §5 (Request lifecycle).
