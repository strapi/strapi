/**
 * Pure classification + diffing logic for the breaking-change triage script.
 *
 * Everything here is deliberately dependency-free and side-effect-free so it can be
 * unit-tested without touching git or the filesystem.
 *
 * See `.ai/skills/breaking-changes/SKILL.md` for the policy these rules encode.
 */

export type Tier = 1 | 2 | 3;

export interface Surface {
  tier: Tier;
  /** Human-readable name of the surface, e.g. "@strapi/types published types". */
  name: string;
}

export interface Finding {
  path: string;
  tier: Tier;
  surface: string;
  /** Which rule produced this finding, e.g. "export-map:removed-subpath". */
  rule: string;
  detail: string;
}

export type ChangeKind = 'added' | 'modified' | 'deleted' | 'renamed';

export interface ChangedFile {
  path: string;
  /** Previous path, for renames. */
  oldPath?: string;
  kind: ChangeKind;
}

const IGNORED = [
  /^examples\//,
  /^tests\//,
  /^scripts\//,
  /^docs\//,
  /^\.github\//,
  /(^|\/)__tests__\//,
  /(^|\/)__mocks__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /(^|\/)dist\//,
  /(^|\/)node_modules\//,
];

/**
 * Path-based surface classification. Ordered: first match wins, most specific first.
 *
 * This is a triage heuristic, not the policy itself. A Tier 1 label means "this file
 * can carry a Tier 1 break" — the agent still has to confirm documentation status on
 * docs.strapi.io before treating a change as a contract violation.
 */
const RULES: Array<[RegExp, Surface]> = [
  [/^packages\/core\/types\//, { tier: 1, name: '@strapi/types published types' }],
  [/^packages\/providers\//, { tier: 1, name: 'provider interface' }],
  [/^packages\/cli\//, { tier: 1, name: 'CLI' }],
  // Admin API routes must be checked before the generic routes rule below — they are
  // Tier 2 ("the Admin API that powers the admin panel"), not Tier 1 HTTP routes.
  [/^packages\/core\/admin\/server\//, { tier: 2, name: 'Admin API' }],
  [/(^|\/)routes(\/|\.[cm]?[jt]s)/, { tier: 1, name: 'HTTP routes' }],
  [/(^|\/)content-types\/.*schema\.json$/, { tier: 1, name: 'content-type schema' }],
  [/(^|\/)schema\.json$/, { tier: 1, name: 'content-type schema' }],
  [/(^|\/)webhooks?(\/|[-.])/i, { tier: 1, name: 'webhook payload' }],
  [/(^|\/)lifecycles?(\/|[-.])/i, { tier: 1, name: 'lifecycle event payload' }],
  [/(^|\/)document-service\//, { tier: 1, name: 'Document Service API' }],
  [/^packages\/plugins\/graphql\//, { tier: 1, name: 'GraphQL Content API' }],
  [/(^|\/)config\//, { tier: 1, name: 'configuration' }],
  [/(^|\/)migrations?\//, { tier: 1, name: 'data migration' }],
  [/^packages\/.*\/package\.json$/, { tier: 2, name: 'package manifest / export map' }],
  [
    /^packages\/.*\/src\/(index|admin|strapi-server|strapi-admin)\.[cm]?[jt]sx?$/,
    { tier: 2, name: 'package public exports' },
  ],
  // Documented today (`strapi.db.query`), so treated as Tier 1 pending the open question
  // in the skill about whether it stays supported alongside the Document Service.
  [
    /^packages\/core\/database\/src\/query\//,
    { tier: 1, name: 'Query Engine API (strapi.db.query) — see open question in skill' },
  ],
  [/^packages\/core\/database\//, { tier: 3, name: 'database layer' }],
  [/^packages\//, { tier: 3, name: 'package internals' }],
];

export const classifyPath = (filePath: string): Surface | null => {
  if (IGNORED.some((pattern) => pattern.test(filePath)) === true) {
    return null;
  }

  const match = RULES.find(([pattern]) => pattern.test(filePath));

  return match === undefined ? null : match[1];
};

/* -------------------------------------------------------------------------- */
/* package.json manifests                                                     */
/* -------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

const exportSubpaths = (manifest: Json): Map<string, string> => {
  const result = new Map<string, string>();
  const exportsField = manifest.exports;

  if (typeof exportsField !== 'object' || exportsField === null) {
    return result;
  }

  for (const [subpath, value] of Object.entries(exportsField as Json)) {
    result.set(subpath, JSON.stringify(value));
  }

  return result;
};

/**
 * Removed or renamed export subpaths, removed export conditions, narrowed engines,
 * tightened peer dependencies, removed bins. All of these break consumers at
 * install- or build-time rather than at runtime, so they are cheap to detect and
 * expensive to miss.
 */
export const diffManifest = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  const findings: Omit<Finding, 'path' | 'surface'>[] = [];

  const beforeExports = exportSubpaths(before);
  const afterExports = exportSubpaths(after);

  for (const [subpath, definition] of beforeExports) {
    if (afterExports.has(subpath) === false) {
      findings.push({
        tier: 2,
        rule: 'export-map:removed-subpath',
        detail: `export subpath "${subpath}" was removed — every consumer importing it breaks at build time`,
      });
      continue;
    }

    if (afterExports.get(subpath) !== definition) {
      findings.push({
        tier: 2,
        rule: 'export-map:changed-conditions',
        detail: `export conditions for "${subpath}" changed — confirm types/import/require all still resolve`,
      });
    }
  }

  const beforeEngines = (before.engines as Json | undefined)?.node;
  const afterEngines = (after.engines as Json | undefined)?.node;

  if (beforeEngines !== undefined && afterEngines !== beforeEngines) {
    findings.push({
      tier: 1,
      rule: 'engines:changed',
      detail: `engines.node changed from "${String(beforeEngines)}" to "${String(afterEngines)}" — confirm whether this narrows supported versions; dropping one still supported upstream is a Tier 1 break`,
    });
  }

  const beforePeers = (before.peerDependencies as Json | undefined) ?? {};
  const afterPeers = (after.peerDependencies as Json | undefined) ?? {};

  for (const [name, range] of Object.entries(beforePeers)) {
    if (name in afterPeers === false) {
      findings.push({
        tier: 2,
        rule: 'peer-deps:removed',
        detail: `peerDependency "${name}" was removed`,
      });
    } else if (afterPeers[name] !== range) {
      findings.push({
        tier: 1,
        rule: 'peer-deps:changed',
        detail: `peerDependency "${name}" moved from "${String(range)}" to "${String(afterPeers[name])}" — confirm whether this narrows supported versions; narrowing forces users to upgrade`,
      });
    }
  }

  const beforeBins = Object.keys((before.bin as Json | undefined) ?? {});
  const afterBins = Object.keys((after.bin as Json | undefined) ?? {});

  for (const bin of beforeBins) {
    if (afterBins.includes(bin) === false) {
      findings.push({
        tier: 1,
        rule: 'bin:removed',
        detail: `CLI binary "${bin}" was removed — the CLI is documented and therefore Tier 1`,
      });
    }
  }

  if (before.name !== undefined && after.name !== before.name) {
    findings.push({
      tier: 1,
      rule: 'manifest:renamed',
      detail: `package renamed from "${String(before.name)}" to "${String(after.name)}"`,
    });
  }

  return findings;
};

/* -------------------------------------------------------------------------- */
/* content-type schemas                                                       */
/* -------------------------------------------------------------------------- */

interface SchemaAttribute {
  type?: string;
  required?: boolean;
  [key: string]: unknown;
}

/**
 * Content-type schema changes touch two surfaces at once: the Content API response
 * shape (Tier 1) and the database schema (Tier 3, freely changeable with a migration).
 * Only the API shape is reported here.
 */
export const diffSchema = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  const findings: Omit<Finding, 'path' | 'surface'>[] = [];

  if (before.kind !== undefined && after.kind !== before.kind) {
    findings.push({
      tier: 1,
      rule: 'schema:kind-changed',
      detail: `kind changed from "${String(before.kind)}" to "${String(after.kind)}" — the Content API route shape changes with it`,
    });
  }

  const beforeAttrs = (before.attributes as Record<string, SchemaAttribute> | undefined) ?? {};
  const afterAttrs = (after.attributes as Record<string, SchemaAttribute> | undefined) ?? {};

  for (const [name, attribute] of Object.entries(beforeAttrs)) {
    const next = afterAttrs[name];

    if (next === undefined) {
      findings.push({
        tier: 1,
        rule: 'schema:removed-attribute',
        detail: `attribute "${name}" was removed — it disappears from Content API responses`,
      });
      continue;
    }

    if (attribute.type !== undefined && next.type !== attribute.type) {
      findings.push({
        tier: 1,
        rule: 'schema:changed-attribute-type',
        detail: `attribute "${name}" changed type from "${String(attribute.type)}" to "${String(next.type)}"`,
      });
    }

    if (attribute.required !== true && next.required === true) {
      findings.push({
        tier: 1,
        rule: 'schema:attribute-now-required',
        detail: `attribute "${name}" became required — existing writes that omit it start failing`,
      });
    }
  }

  for (const [name, attribute] of Object.entries(afterAttrs)) {
    if (name in beforeAttrs === false && attribute.required === true) {
      findings.push({
        tier: 1,
        rule: 'schema:new-required-attribute',
        detail: `new attribute "${name}" is required — additive only if optional`,
      });
    }
  }

  return findings;
};

/* -------------------------------------------------------------------------- */
/* source-level surfaces                                                      */
/* -------------------------------------------------------------------------- */

const NAMED_EXPORT_PATTERNS = [
  /export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|type|interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  /export\s+\{([^}]*)\}/g,
];

/** Best-effort set of identifiers a module exports. Regex-based: approximate by design. */
export const collectNamedExports = (source: string): Set<string> => {
  const names = new Set<string>();

  for (const match of source.matchAll(NAMED_EXPORT_PATTERNS[0])) {
    names.add(match[1]);
  }

  for (const match of source.matchAll(NAMED_EXPORT_PATTERNS[1])) {
    for (const entry of match[1].split(',')) {
      const parts = entry.trim().split(/\s+as\s+/);
      const exposed = (parts[1] ?? parts[0]).trim().replace(/^type\s+/, '');

      if (exposed.length > 0) {
        names.add(exposed);
      }
    }
  }

  return names;
};

/**
 * `export default <expression>` (a reference, class expression, object literal, …) has no
 * identifier for `collectNamedExports` to pick up, so a default export slot needs its own
 * best-effort detector — otherwise removing `export default admin;` goes unnoticed.
 */
export const hasDefaultExport = (source: string): boolean => {
  if (/export\s+default\b/.test(source)) {
    return true;
  }

  for (const match of source.matchAll(NAMED_EXPORT_PATTERNS[1])) {
    for (const entry of match[1].split(',')) {
      const parts = entry.trim().split(/\s+as\s+/);
      const exposed = (parts[1] ?? parts[0]).trim();

      if (exposed === 'default') {
        return true;
      }
    }
  }

  return false;
};

export const diffNamedExports = (
  before: string,
  after: string
): Omit<Finding, 'path' | 'surface'>[] => {
  const afterNames = collectNamedExports(after);

  const findings = [...collectNamedExports(before)]
    .filter((name) => afterNames.has(name) === false)
    .map((name) => ({
      tier: 2 as Tier,
      rule: 'exports:removed-symbol',
      detail: `"${name}" is no longer exported — Tier 1 if it is documented, Tier 2 otherwise`,
    }));

  if (hasDefaultExport(before) === true && hasDefaultExport(after) === false) {
    findings.push({
      tier: 2,
      rule: 'exports:removed-default',
      detail: `the default export was removed — Tier 1 if it is documented, Tier 2 otherwise`,
    });
  }

  return findings;
};

/** Route paths declared in a routes file. Regex-based: approximate by design. */
export const collectRoutePaths = (source: string): Set<string> =>
  new Set([...source.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map((match) => match[1]));

export const diffRoutes = (before: string, after: string): Omit<Finding, 'path' | 'surface'>[] => {
  const afterPaths = collectRoutePaths(after);

  return [...collectRoutePaths(before)]
    .filter((routePath) => afterPaths.has(routePath) === false)
    .map((routePath) => ({
      tier: 1 as Tier,
      rule: 'routes:removed-path',
      detail: `route "${routePath}" is gone — this tool can't tell Content API from Admin API routes; confirm the surface and documentation status on docs.strapi.io before deciding between Tier 1 and Tier 2`,
    }));
};
