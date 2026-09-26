---
title: Content structure file
description: The version 1 folder-group configuration for Content Type Builder
tags:
  - content-type-builder
  - content-structure
---

# Content structure file

`src/content-structure/groups.json` stores the folder organization shown by the Content Type
Builder. It is an application configuration file, not content data.

## Source, build, and deployment

Author and commit `src/content-structure/groups.json`. The Content Type Builder writes to that
source path. During the application build, the compiler produces the runtime artifact at
`dist/src/content-structure/groups.json`; Strapi reads that `dist` artifact at runtime and caches
the cleaned structure in the current process. A successful Content Type Builder write invalidates
that local cache, and the normal compile/reload lifecycle refreshes the `dist` artifact before the
runtime reads it again. Do not edit the `dist` file directly: it is build output and will be
replaced by the next build.

Treat the source file as part of the application source control and deploy it with the same
application revision as the content-type schemas it references. Build the deployed application
from that revision so its `dist` artifact contains the same file. A deployment that reuses an old
or missing build artifact will use the old folder organization, or no folders, until it is rebuilt
and restarted.

Data Transfer (DTS) does not inspect, transfer, restore, or delete this file. Core-store does not
persist it. Moving database data or running a DTS import therefore does not move
folder organization; use source control and the normal application build/deployment flow instead.

## Version 1 format

The file is a JSON object with all of these required properties:

- `version`: the number `1`.
- `sections.collectionTypes.groups`: an array of collection-type groups.
- `sections.singleTypes.groups`: an array of single-type groups.

Each group has these required properties:

- `id`: an opaque, non-empty string. It has no required prefix or character pattern. The Content
  Type Builder currently generates IDs with a `grp_` prefix, but hand-authored IDs such as
  `products` or `my-folder` are valid.
- `name`: a user-visible string from 1 through 255 characters. It must not be blank or consist
  only of whitespace, must not start or end with whitespace, and must not contain control
  characters or ANSI escape sequences.
- `parent`: `null` for a root group, or the ID of its parent group.
- `children`: an array of child entries. A content-type child is
  `{ "type": "contentType", "uid": "<content-type-uid>" }`; a group child is
  `{ "type": "group", "id": "<group-id>" }`.

This is a minimal valid file with one empty root group:

```json
{
  "version": 1,
  "sections": {
    "collectionTypes": {
      "groups": [
        {
          "id": "products",
          "name": "Products",
          "parent": null,
          "children": []
        }
      ]
    },
    "singleTypes": {
      "groups": []
    }
  }
}
```

## Validation rules

Content Type Builder writes validate the complete structure strictly. A rejected write is not
silently normalized into a different source file.

Group IDs are unique across both sections, not only within one section. Parent and group-child
references must use the exact ID and stay in the same section. The two directions of the group
tree must agree: every non-root group is listed exactly once as a group child of its parent, and a
root group is not a group child. A group tree cannot contain a cycle. Its root has depth 1 and no
group may be deeper than depth 3.

Sibling group names must be unique within the same parent, case-insensitively. For example,
`Marketing` and `marketing` cannot both be root groups in `collectionTypes`, but the same name can
be used under different parents or in the other section.

Content-type UIDs must use a supported fully qualified form: `strapi::<name>`, `admin::<name>`,
`api::<api>.<content-type>`, or `plugin::<plugin>.<content-type>`, where each name contains word
characters or hyphens. On a Content Type Builder write, each referenced UID must exist in the
effective content-type registry and have the kind for its section: collection types in
`collectionTypes` and single types in `singleTypes`. A UID can appear in at most one group in each
section.

## Runtime cleaning

Runtime loading is intentionally more tolerant than a Content Type Builder write. After confirming
that the JSON parses, has `version: 1`, and has a `sections` object, Strapi cleans each section in
memory and logs warnings. It can drop malformed groups and children, duplicate group IDs within a
section, duplicate content-type references, unknown content types, wrong-kind content types, and
inconsistent group children. It reparents groups with missing parents, cycles, or excessive depth
to the root, and it adds a missing reciprocal group child when the parent reference is otherwise
valid.

If the file cannot be parsed, has no `sections` object, or has an unsupported version, Strapi
continues without content-type folders. Cleaning does not rewrite the source or `dist` file. Fix
the source file, rebuild, and restart rather than relying on runtime cleaning as a migration tool.
Manual source edits do not pass through the strict Content Type Builder request validator, so they
must follow the validation rules above before they are built and deployed.

## Troubleshooting

- If a folder is missing, check the startup warnings first. A malformed entry, an unavailable
  content type, a type in the wrong section, or an invalid graph edge may have been omitted while
  the remaining structure continued to load.
- If a Content Type Builder save is rejected, check both sides of every parent/child edge,
  duplicate IDs across both sections, the depth limit, and sibling names after case folding.
- If a source edit does not appear in production, verify that the deployed build was generated from
  the revision containing `src/content-structure/groups.json`; runtime does not read the source
  path directly.
