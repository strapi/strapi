---
name: create-issue
description: Use when drafting or publishing an issue on strapi/strapi, including with `gh issue create`. Trigger whenever an agent is about to open a GitHub issue in this repo, even if the user only says "file a bug" or "open an issue for this".
---

# Create a strapi/strapi bug report

Source of truth: [BUG_REPORT.yml](../../../.github/ISSUE_TEMPLATE/BUG_REPORT.yml) for the fields, and [issue-template-check.ts](../../../.github/scripts/issue-template-check.ts) for what CI accepts.

An issue created with `gh issue create --body-file` gets nothing from the issue form. The body must contain everything the form would produce. If it does not, the [template check workflow](../../../.github/workflows/template-check-on-new-issue.yaml) adds `flag: invalid template` and a bot comment, and the issue is closed after 1 day. The check runs again on every edit.

## Scope

This flow is for bugs in this repository only. Route other requests to the links in [config.yml](../../../.github/ISSUE_TEMPLATE/config.yml): feature requests, RFCs, documentation, the SDKs, and the design system have their own trackers.

## Flow

### 1. Analyze

Combine the user's input with codebase research:

- Read the relevant packages and files to confirm the behavior and find the root cause.
- Identify the affected packages, versions, and a reproduction path.
- Ask the user only for what research cannot establish: Node version, package manager and its version, Strapi version, OS, database, JS or TS, reproduction URL.

### 2. Check for duplicates

The template asks the reporter to confirm this. Do it before you write the draft:

```bash
gh issue list --repo strapi/strapi --state all --search "<keywords>" --limit 20
```

If a matching issue exists, show it to the user and stop, or add a comment to it instead.

### 3. Write the draft

Save the draft outside the repository, for example in a temporary directory. Do not commit it.

Map every `body` field of `BUG_REPORT.yml` to markdown:

- Write one `### <label>` section per field, with the exact `label` text. Each `input` is its own section: `Package Manager` and `Package Manager Version` are two sections.
- For a `dropdown` field, use one of its `options` values.
- Fill every required field. If a value is unknown, write `[NEEDS INPUT]` and ask the user before you publish.
- Write the `checkboxes` field (`Confirmation Checklist`) as checked `- [x]` lines, with the option labels copied from the template:

  ```md
  ### Confirmation Checklist

  - [x] I have checked the existing [issues](https://github.com/strapi/strapi/issues) for duplicates.
  - [x] I agree to follow this project's [Code of Conduct](https://github.com/strapi/strapi/blob/develop/CODE_OF_CONDUCT.md).
  ```

Be concise. Give the cause with file paths when research found it, and steps that someone else can run.

### 4. Validate the draft

Run the same check as CI, from anywhere in the repository:

```bash
node --experimental-strip-types --no-warnings --input-type=module -e "import { readFileSync } from 'node:fs'; import { validateIssueTemplate } from '$(git rev-parse --show-toplevel)/.github/scripts/issue-template-check.ts'; const r = validateIssueTemplate(readFileSync(process.argv[1], 'utf8')); console.log(JSON.stringify(r)); process.exit(r.valid ? 0 : 1);" <draft-path>
```

Exit `0` prints `{"valid":true,"missingItems":[]}`. On exit `1`, fix every item in `missingItems` and run the check again. Never publish a draft that fails.

### 5. Review and publish

1. Show the user the draft path, the proposed title, and the body.
2. Ask the user to confirm before you publish. Never publish without confirmation.
3. On confirmation:

   ```bash
   gh issue create --repo strapi/strapi \
     --title "<title>" \
     --body-file <draft-path>
   ```

   Add `--assignee <login>` only when the user asks for it.

4. Return the issue URL.

After publishing, check that the issue has no `flag: invalid template` label:

```bash
gh issue view <number> --repo strapi/strapi --json labels -q '.labels[].name'
```
