# ADR-0013: Guard missing `package.json` for no-files apps

**Status:** Accepted

## Context

`loadConfiguration` currently does `require(path.resolve(appDir, 'package.json'))` to read
`strapi.uuid`, version, and `info.dependencies` (the last is used by legacy plugin
discovery). A true no-files programmatic app may have no `package.json` at `appDir`,
which would crash startup.

## Decision

Guard the `package.json` read in `loadConfiguration`:

- If present, use it as today (preserves legacy behavior and dependency-based discovery
  when `plugins: fromDisk()` is used).
- If absent, **synthesize minimal app info** (name, empty dependencies, generated/uuid
  placeholders) so the app boots without a `package.json`.

## Consequences

- No-files apps boot; file-based apps unaffected.
- Telemetry/update-notifier fields that rely on `package.json` degrade gracefully when
  synthesized.

## Alternatives considered

- **Require a `package.json` always.** Rejected: defeats the "import and run" primitive
  goal.
