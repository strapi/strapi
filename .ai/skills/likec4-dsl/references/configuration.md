# Project Configuration Reference

LikeC4 projects are defined by a config file. The file's location determines project scope — all `.c4` files in the directory (and subdirectories) belong to that project.

## Config File Names

LikeC4 recognizes (in any order):

| Format     | File names                                               |
| ---------- | -------------------------------------------------------- |
| JSON/JSON5 | `.likec4rc`, `.likec4.config.json`, `likec4.config.json` |
| JavaScript | `likec4.config.js`, `likec4.config.mjs`                  |
| TypeScript | `likec4.config.ts`, `likec4.config.mts`                  |

## JSON Config Schema

Always include `$schema` for validation and autocomplete:

```json
{
  "$schema": "https://likec4.dev/schemas/config.json",
  "name": "my-project"
}
```

## All Options

### `name` (required)

Unique project identifier. Must not be `"default"`. Cannot contain `.`, `@`, or `#`.

```json
{ "name": "cloud-platform" }
```

### `title`

Human-readable project title.

```json
{ "name": "cloud-platform", "title": "Cloud Platform Architecture" }
```

### `metadata`

Arbitrary key-value pairs for custom project information.

```json
{
  "metadata": {
    "owner": "platform-team",
    "domain": "payments",
    "version": "2.0"
  }
}
```

### `contactPerson`

Person involved in creating or maintaining the project.

```json
{ "contactPerson": "Jane Doe" }
```

### `include`

Reference external directories containing `.c4` files.

```json
{
  "include": {
    "paths": ["../shared", "../common/specs"],
    "maxDepth": 5,
    "fileThreshold": 50
  }
}
```

| Property        | Type       | Default    | Description                            |
| --------------- | ---------- | ---------- | -------------------------------------- |
| `paths`         | `string[]` | (required) | Relative directory paths to scan       |
| `maxDepth`      | `number`   | `3`        | Directory scan depth (1–20)            |
| `fileThreshold` | `number`   | `30`       | Warn if loaded file count exceeds this |

### `exclude`

Glob patterns (picomatch) to exclude files. Default: `["**/node_modules/**"]`.

```json
{ "exclude": ["**/node_modules/**", "**/generated/**"] }
```

### `inferTechnologyFromIcon`

Auto-derive `technology` from icon name when not set explicitly. Applies to `aws:`, `azure:`, `gcp:`, `tech:` icons. Default: `true`.

```json
{ "inferTechnologyFromIcon": false }
```

### `implicitViews`

Auto-generate scoped views for elements without explicit views, enabling drill-down navigation. Default: `false`.

```json
{ "implicitViews": true }
```

### `imageAliases`

Shortcuts for image directory paths. Default alias `@` points to `./images`.

```json
{
  "imageAliases": {
    "@": "./images",
    "@shared": "../../shared-images"
  }
}
```

### `manualLayouts`

Configure where manual layout data is stored.

```json
{
  "manualLayouts": {
    "outDir": ".likec4"
  }
}
```

`outDir` is relative to the config file location. Default: `".likec4"`.

### `styles`

Theme customization and default styling.

```json
{
  "styles": {
    "theme": {
      "colors": {
        "primary": "#FF6B6B",
        "secondary": "rgba(37,99,235,1)"
      }
    },
    "defaults": {
      "border": "dashed",
      "opacity": 100,
      "size": "md",
      "relationship": {
        "color": "gray",
        "line": "dashed"
      }
    }
  }
}
```

### `extends`

Inherit styles from other config files (JSON only). Single path or array.

```json
{ "extends": "../shared/likec4.config.json" }
{ "extends": ["../shared/base.json", "../shared/theme.json"] }
```

### `landingPage`

Configure the landing page of the generated site.

Redirect to index view:

```json
{ "landingPage": { "redirect": true } }
```

Show only specific views:

```json
{ "landingPage": { "include": ["overview", "cloud-detail"] } }
```

Hide specific views:

```json
{ "landingPage": { "exclude": ["internal-debug"] } }
```

### `generators` (TypeScript/JS config only)

Custom generators that produce output from the model.

```typescript
import { defineConfig } from 'likec4';

export default defineConfig({
  name: 'my-project',
  generators: {
    'my-gen': async ({ likec4model, ctx }) => {
      const elements = likec4model.elements();
      await ctx.write({
        path: 'output.json',
        content: JSON.stringify(elements, null, 2),
      });
    },
  },
});
```

Run with: `likec4 gen my-gen`

## Multi-Project Setup

Each config file in the workspace defines a separate project. Files belong to the project of the nearest config file in the directory hierarchy.

```
workspace/
├─ project-a/
│  ├─ likec4.config.json    ← project "a"
│  ├─ model.c4
│  └─ views.c4
├─ project-b/
│  ├─ likec4.config.json    ← project "b"
│  └─ model.c4
└─ shared/
   └─ common.c4             ← included via "include.paths"
```

Use `include.paths` to share `.c4` files across projects.

## Minimal Starter Config

```json
{
  "$schema": "https://likec4.dev/schemas/config.json",
  "name": "my-project",
  "title": "My Architecture"
}
```

**Important:** Always include `"$schema"` (recommended) — it enables IDE autocomplete and validation for your config file.

### Common Mistake: Missing $schema

```json
// ❌ Missing $schema — no IDE validation/autocomplete
{
  "name": "my-project"
}

// ✅ Correct — with schema for IDE support
{
  "$schema": "https://likec4.dev/schemas/config.json",
  "name": "my-project"
}
```
