---
title: CodeMirror dependency alias
tags:
  - admin
  - content-manager
  - dependencies
---

# The `codemirror5` dependency alias

`@strapi/admin` and `@strapi/content-manager` both declare CodeMirror 5 through an
[npm package alias](https://docs.npmjs.com/cli/v10/commands/npm-install#description) in their
runtime `dependencies`:

```json
{
  "dependencies": {
    "codemirror5": "npm:codemirror@^5.65.11"
  }
}
```

This installs the real package `codemirror@5` but exposes it under the name `codemirror5`, so the
code imports it explicitly:

```ts
import CodeMirror from 'codemirror5';
import 'codemirror5/addon/display/placeholder';
```

## Why the alias exists

Two **major versions of CodeMirror coexist** in the dependency tree, and the alias is what keeps
them isolated:

| Version          | Consumer                                                        | How it is pulled in                                       |
| ---------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| CodeMirror **5** | The legacy Markdown WYSIWYG editor in `@strapi/content-manager` | Direct dependency, via the `codemirror5` alias            |
| CodeMirror **6** | `@strapi/design-system`'s code/JSON editor                      | Transitive, via `@uiw/react-codemirror` → `codemirror@^6` |

Both are published under the same package name (`codemirror`) at incompatible majors. Declaring a
plain `"codemirror": "^5"` dependency would compete with the hoisted transitive `codemirror@^6`, and
the WYSIWYG could resolve to the CodeMirror 6 API at build time (a breaking change). The alias pins
CodeMirror 5 deterministically for the admin bundle, independent of hoisting.

## Known incompatibility: alias-unaware supply-chain scanners

Some enterprise supply-chain tools do not understand npm aliases and treat `codemirror5` as if it
were a real published package. For example, JFrog Curation (`jf ca`) requests a non-existent tarball
and fails with a 404:

```text
[🚨Error] failed sending HEAD request to
https://<artifactory>/artifactory/api/npm/<repo>/codemirror5/-/codemirror5-5.65.21.tgz
for package 'codemirror5:5.65.21'. Status-code: 404
```

The alias itself is valid npm syntax and installs correctly (`npm ls codemirror5` resolves to
`codemirror@5.65.x`). The failure is in the scanner's resolution of the alias name, not in the
dependency graph. See [#26865](https://github.com/strapi/strapi/issues/26865).

### Workarounds

`npm`/`yarn` `overrides`/`resolutions` do **not** help — the scanner reads the alias _name_
(`codemirror5`) before resolution, so pinning the underlying version changes nothing.

Configure the scanner to skip the aliased name instead. The underlying package remains fully
auditable under its real name, `codemirror@5.65.x`.

- **JFrog Curation** — add a policy exclusion (waiver) for the component named `codemirror5` in the
  Curation policy that governs the repository. Match by component name rather than version, because
  no `codemirror5` tarball is ever resolved.
- **Other alias-unaware scanners** — exclude or ignore the `codemirror5` component by name, or point
  the audit at the resolved package `codemirror@5.65.x`.

## Removing the alias

The alias can only be dropped once the legacy Markdown WYSIWYG editor no longer depends on
CodeMirror 5 — for example by migrating it to the CodeMirror 6 stack already present in the tree
(`@uiw/react-codemirror`). Until then the alias is load-bearing and must remain in
`dependencies`.
