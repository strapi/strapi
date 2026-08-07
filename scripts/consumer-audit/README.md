# Consumer dependency audit

Audits the **third-party production dependency closure** of a default `create-strapi-app` using pins from this monorepo’s `package.json` files (not the Yarn lockfile / monorepo devDeps).

```bash
# From repo root (needs network for npm install of the scratch app; no monorepo yarn install required)
node scripts/consumer-audit/run.mjs
node scripts/consumer-audit/run.mjs --out /tmp/consumer-audit
node scripts/consumer-audit/run.mjs --no-fail   # report only
```

- **`packages.json`** — CSA root packages + app-level deps  
- **`baseline.json`** — `accepted` (holds) and `known` (tracked debt); CI fails only on **novel** findings  
- **CI** — `.github/workflows/consumer-audit.yml` (weekly + `workflow_dispatch`)
