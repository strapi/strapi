---
name: writing-skills
description: Creates new agent skills with progressive disclosure and bundled resources. Use when the user wants to create, write, or build a new skill.
---

# Writing Skills

## Process

1. **Gather requirements** - ask user about:

   - What task/domain does the skill cover?
   - What specific use cases should it handle?
   - Does it need executable scripts or just instructions?
   - Any reference materials to include?

2. **Draft the skill** - create:

   - SKILL.md with concise instructions
   - Additional reference files if content exceeds 500 lines
   - Utility scripts if deterministic operations needed

3. **Review with user** - present draft and ask:

   - Does this cover your use cases?
   - Anything missing or unclear?
   - Should any section be more/less detailed?

## Skill Structure

```
skill-name/
├── SKILL.md           # Main instructions (required)
├── REFERENCE.md       # Detailed docs (if needed)
├── EXAMPLES.md        # Usage examples (if needed)
└── scripts/           # Utility scripts (if needed)
    └── helper.ts
```

## SKILL.md Template

```md
---
name: skill-name
description: Brief description of capability. Use when [specific triggers].
---

# Skill Name

## Quick start

[Minimal working example]

## Workflows

[Step-by-step processes with checklists for complex tasks]

## Advanced features

[Link to separate files: See [REFERENCE.md](REFERENCE.md)]
```

## Conciseness Principle

Once the agent loads SKILL.md, every token in it competes with conversation history and other context. Only include what the agent doesn't already know. For each line, ask: _"can I assume the agent knows this?"_ and _"does this paragraph justify its token cost?"_ Prefer concrete examples over explanations.

## Frontmatter Constraints

The `name` field is also validated:

- Max 64 characters
- Lowercase letters, numbers, and hyphens only
- No reserved words (`anthropic`, `claude`)
- Prefer gerund form (`processing-pdfs`, `writing-documentation`); noun phrases (`pdf-processing`) are also acceptable

## Description Requirements

The description is **the only thing your agent sees** when deciding which skill to load. It's surfaced in the system prompt alongside all other installed skills. Your agent reads these descriptions and picks the relevant skill based on the user's request.

**Goal**: Give your agent just enough info to know:

1. What capability this skill provides
2. When/why to trigger it (specific keywords, contexts, file types)

**Format**:

- Max 1024 chars
- Write in third person
- First sentence: what it does
- Second sentence: "Use when [specific triggers]"

**Good example**:

```
Extract text and tables from PDF files, fill forms, merge documents. Use when working with PDF files or when user mentions PDFs, forms, or document extraction.
```

**Bad example**:

```
Helps with documents.
```

The bad example gives your agent no way to distinguish this from other document skills.

## When to Add Scripts

Add utility scripts when:

- Operation is deterministic (validation, formatting)
- Same code would be generated repeatedly
- Errors need explicit handling

## When to Split Files

Split into separate files when:

- SKILL.md body exceeds 500 lines
- Content has distinct domains (finance vs sales schemas)
- Advanced features are rarely needed

**Reference file rules:**

- Keep references **one level deep** from SKILL.md. Agents may only partially read nested references (e.g. `head -100`), so files linked from another reference file can be missed.
- Reference files longer than 100 lines should include a table of contents at the top so the agent can see the full scope even on a partial read.

## Common Pitfalls

- **Time-sensitive info** — don't write "After August 2025, use the new API". Move legacy content into a clearly-marked "Old patterns" section that won't rot.
- **Inconsistent terminology** — pick one term (e.g. "field", not also "box" / "element" / "control") and use it throughout.
- **Windows-style paths** — always use forward slashes (`scripts/helper.py`), even when authored on Windows.
- **Too many options** — pick a default and provide an escape hatch. Don't enumerate every library; say "Use X. For [edge case], use Y instead."
- **Punting to the agent in scripts** — handle errors explicitly inside utility scripts rather than letting them fail. Avoid voodoo constants — document why values like timeouts or retry counts were chosen.
- **MCP tool references** — always use fully qualified names (`ServerName:tool_name`) to avoid "tool not found" errors when multiple MCP servers are loaded.
- **Ambiguous script intent** — make clear whether the agent should _run_ a script ("Run `analyze_form.py` to extract fields") or _read_ it ("See `analyze_form.py` for the extraction algorithm"). Execution is preferred for utilities.

## Review Checklist

After drafting, verify:

- Description includes triggers ("Use when...")
- Name is lowercase, hyphens only, ≤64 chars, no reserved words
- SKILL.md body under 500 lines
- No time-sensitive info
- Consistent terminology
- Concrete examples included
- Reference files link directly from SKILL.md, not from other reference files
- All file paths use forward slashes
