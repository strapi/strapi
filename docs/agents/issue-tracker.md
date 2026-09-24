# Issue tracker: Obsidian (personal), Linear (company)

Issues and PRDs for this repo are tracked **personally in Obsidian first**, and only promoted to the company **Linear** workspace when explicitly asked. This keeps solo/exploratory work out of the shared tracker until it's ready.

## Where issues live

- Markdown notes under **`notes/work/strapi/issues/`** in Obsidian, one file per issue.
- Created, read, and updated via the **Obsidian MCP tools** — `write_note`, `read_note`, `search_notes`, `patch_note`, `update_frontmatter`, `list_directory`.

## Note shape

Filename: `<slug>.md` (e.g. `cm-403-redirect-loop.md`). Frontmatter carries the tracker state:

```yaml
---
title: <short description>
type: issue
status: <open | in-progress | closed>
labels: [needs-triage] # one or more of the triage roles — see docs/agents/triage-labels.md
created: YYYY-MM-DD
linear: <Linear issue URL, once promoted>
---
```

Body: freeform — problem statement, repro, context, acceptance criteria, notes.

## Conventions

- **Create an issue**: `write_note` a new file under `notes/work/strapi/issues/` with the frontmatter above.
- **Read an issue**: `read_note` by title/permalink, or `search_notes` to find it.
- **List / query issues**: `list_directory` on `notes/work/strapi/issues/`, or `search_notes` / `search_by_metadata` filtering on `status` and `labels`.
- **Comment / update**: `patch_note` to append to the body, or `update_frontmatter` to change `status` / `labels`.
- **Apply / remove triage labels**: edit the `labels` frontmatter array via `update_frontmatter` (mapping in `docs/agents/triage-labels.md`).
- **Close**: set `status: closed` via `update_frontmatter`.

## Escalating to Linear

Only when the user explicitly asks to promote an issue:

- Create the Linear issue with the **Linear MCP** `save_issue` tool (title + body from the Obsidian note).
- Record the returned Linear issue URL back into the Obsidian note's `linear:` frontmatter so the two stay linked.
- Keep the Obsidian note as the working copy unless the user asks to move tracking to Linear entirely.

## When a skill says "publish to the issue tracker"

Write a new markdown note under `notes/work/strapi/issues/` via the Obsidian MCP `write_note` tool.

## When a skill says "fetch the relevant ticket"

`read_note` (or `search_notes`) the corresponding note under `notes/work/strapi/issues/`. If the note has a `linear:` URL and the user wants the canonical company record, fetch it with the Linear MCP `get_issue` tool.
