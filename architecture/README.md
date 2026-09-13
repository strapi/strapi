# Strapi Architecture

This directory contains a LikeC4 workspace for modeling the Strapi monorepo.

The goal is to explain how Strapi works at different levels of detail:

- product/system context for non-engineers,
- container views for major capability and runtime boundaries,
- component views for internals of one capability or container.

## Setup

```bash
cd architecture
yarn install
```

## Work Locally

```bash
yarn dev
```

The LikeC4 dev server watches all `.c4` and `.likec4` files in this directory.

## Build Or Export

```bash
yarn build
yarn export:png
yarn export:mermaid
```

## File Ownership

- `specification.c4` defines the modeling notation.
- `model/strapi.c4` contains shared Strapi actors, systems, containers, components, and stable relationships.
- `views/overview.c4` contains the top-level system and container views.
- `views/<domain>.c4` contains focused views for one feature, plugin, or workflow.
- `visual/` is reserved for future UI-generated LikeC4 files.

Do not put every feature into a single global map. A feature or plugin can have its own small
view file with focused static views.

## Modeling Levels

Use the lowest level of detail that explains the idea clearly.

- **System context:** PM-readable; no internals.
- **Container view:** major Strapi capabilities or runtime boundaries, not npm package dependency trees.
- **Component view:** internals of one container or capability.

Package names belong in `technology` fields as implementation evidence. Do not name a container
after a package unless that package is also a clear runtime, deployable, or product capability.

Shared library packages such as `@strapi/types` and `@strapi/utils` should not appear as containers
unless the view is specifically about library architecture.

## Designing A New Feature

1. Write a short architecture note before modeling:
   - audience,
   - user path,
   - runtime path,
   - persistence or provider boundaries,
   - extension points.
2. Add or reuse shared model elements in `model/strapi.c4` only when the feature introduces a meaningful capability boundary.
3. Add components inside the relevant container only when they explain behavior better than package names.
4. Create or update a focused `views/<domain>.c4` file with:
   - one focused container view if needed,
   - one component view for internals.
5. Validate the edited files.

## Documenting Existing Behavior

1. Inspect the implementation first and collect evidence paths.
2. Model only the minimum containers and components needed to explain the behavior.
3. Prefer focused static views over large global maps.
4. Put implementation paths in `technology` fields, not in labels.
5. Include the view IDs in PR notes so reviewers know what to inspect.

## Review Criteria

- The top-level view is understandable by non-engineers.
- Container views show capability boundaries, not package dependency trees.
- Component views stay focused on one container or capability.
- Feature/plugin views are allowed to stand alone; they do not need to be forced into a global map.

## Validation

Run validation with every edited LikeC4 source file passed through repeated `--file` flags:

```bash
cd architecture
HOME=$PWD ./node_modules/.bin/likec4 validate --json --no-layout --file model/strapi.c4 --file views/<domain>.c4 .
```

For example:

```bash
HOME=$PWD ./node_modules/.bin/likec4 validate --json --no-layout --file model/strapi.c4 --file views/content-api.c4 .
```

Use `likec4 validate`; there is no `likec4 check` command.

In JSON output:

- `filteredFiles` is the number of `.c4` or `.likec4` files matched by `--file`.
- `filteredErrors` is the number of errors in those matched files.
- `totalErrors` is the number of errors across the full LikeC4 project model.

The current LikeC4 version may report `filteredFiles: 0` for valid file-filtered runs. Treat
`valid: true` and `totalErrors: 0` as the reliable project-level success signal.

## Future Visual Editing

LikeC4 remains the source of truth. If a visual editor is built later, it should generate controlled
files under `visual/` and validate them before commit. It should not rewrite arbitrary hand-authored
files under `model/` or `views/`.
