# Spaces demo app

A copy of `examples/getstarted` with **`@strapi/plugin-spaces`** (virtual
multi-tenancy) enabled. Two spaces are seeded on first boot: **Default** and
**Acme**.

## What's wired up

- The plugin is enabled in `config/plugins.js`.
- The **Article** content type is space-scoped
  (`pluginOptions.spaces.scope: "space"` in its schema.json) — a `space_id`
  column is added to the `articles` table on first boot. Articles are localized,
  so the per-space locale bindings apply to them too.
- Every other content type (categories, tags, …) stays platform-wide: shared
  across every space.

## Try it

```bash
# From the repo root: build the monorepo packages once
yarn build

# Then run the demo
cd examples/spaces-demo
yarn develop
```

### In the admin

1. Create your admin account. You're always in exactly one workspace — the
   **workspace switcher** sits at the bottom of the main navigation, right
   above your avatar, as a colored bubble with the active workspace's initial
   (you land in "Default"). Open the Content Manager → Article list, create an
   article, then switch to "Acme": the article disappears. The switcher's
   **"Add a workspace"** entry opens a creation modal (name, slug, color) and
   switches you to the new workspace right away.
2. **Settings → Global settings → Workspaces**: list every workspace (archived
   ones included), create, rename, recolor, archive/restore. Slugs are
   immutable and the last active workspace can't be archived.
3. Select entries in the list (or open one) and use **"Move to workspace…"**
   to move them across. The action is RBAC-gated
   (`plugin::spaces.move-entry`) — the super admin has it.
4. Settings → Internationalization: locales now carry **"Available in spaces"**
   and **"Default in spaces"** — bind a locale to a single space and watch the
   locale picker in the Content Manager follow the active space.

### From the API

```bash
# Create an article in the default space
curl -X POST http://localhost:1337/api/articles \
  -H "Content-Type: application/json" \
  -H "X-Strapi-Space-Id: default" \
  -d '{"data":{"title":"Hello from default"}}'

# Visible from default…
curl -H "X-Strapi-Space-Id: default" http://localhost:1337/api/articles

# …invisible from acme
curl -H "X-Strapi-Space-Id: acme" http://localhost:1337/api/articles

# No header = platform view (no tenant filter)
curl http://localhost:1337/api/articles
```

(Grant the public role `find`/`create` permissions on Article first, or use an
API token.)

See `packages/plugins/spaces/docs/design.html` for the full design, and
`packages/plugins/spaces/README.md` for the plugin's own docs.
