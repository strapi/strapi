/**
 * Pure classification + diffing logic for the breaking-change triage script.
 *
 * Everything here is deliberately dependency-free and side-effect-free so it can be
 * unit-tested without touching git or the filesystem.
 *
 * See `.ai/skills/breaking-changes/SKILL.md` for the policy these rules encode.
 */

import path from 'node:path';

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
 * Files a package publishes as an entry point, discovered from its manifest rather than
 * guessed from the path: the `source` condition of each export-map subpath, the top-level
 * `source` field, and each `bin` target. Keyed by repo-relative path.
 */
export interface PublishedFiles {
  entries: Set<string>;
  bins: Set<string>;
}

export const emptyPublishedFiles = (): PublishedFiles => ({ entries: new Set(), bins: new Set() });

/**
 * Path-based surface classification. Ordered: first match wins, most specific first.
 *
 * This is a triage heuristic, not the policy itself. A Tier 1 label means "this file
 * can carry a Tier 1 break" — the agent still has to confirm documentation status on
 * docs.strapi.io before treating a change as a contract violation.
 */
const RULES: Array<[RegExp, Surface]> = [
  [/^packages\/core\/types\//, { tier: 1, name: '@strapi/types published types' }],
  // Scaffolding for new projects. Changing it never touches an existing application.
  [/^packages\/cli\/create-strapi-app\/templates\//, { tier: 3, name: 'project templates' }],
  // Admin-panel implementation details are Tier 3. Its published entry files are lifted
  // back to Tier 2 by the export map, see `classifyPath`.
  [/(^|\/)admin\/src\//, { tier: 3, name: 'admin-panel implementation' }],
  [/(^|\/)content-types\/.*schema\.json$/, { tier: 1, name: 'content-type schema' }],
  [/(^|\/)schema\.json$/, { tier: 1, name: 'content-type schema' }],
  [/(^|\/)webhooks?(\/|[-.])/i, { tier: 1, name: 'webhook payload' }],
  [/(^|\/)lifecycles?(\/|[-.])/i, { tier: 1, name: 'lifecycle event payload' }],
  [/(^|\/)document-service\//, { tier: 1, name: 'Document Service API' }],
  // The configuration loader lives in `configuration/`, plugin defaults in `config/`.
  [/(^|\/)config(uration)?\//, { tier: 1, name: 'configuration' }],
  // Routes are split by the type Strapi gives them. A route file that names neither type
  // stays Tier 1: when the surface cannot be determined, the skill says escalate.
  [/(^|\/)routes?\/.*content-api|content-api\/routes/, { tier: 1, name: 'Content API routes' }],
  [/^packages\/core\/admin\/(ee\/)?server\//, { tier: 2, name: 'Admin API' }],
  [/(^|\/)routes\/(.*\/)?admin(\/|\.[cm]?[jt]s$)/, { tier: 2, name: 'Admin API routes' }],
  [/(^|\/)routes(\/|\.[cm]?[jt]s)/, { tier: 1, name: 'HTTP routes (type not detected)' }],
  // Documented today (`strapi.db.query`), so treated as Tier 1 pending the open question
  // in the skill about whether it stays supported alongside the Document Service.
  [
    /^packages\/core\/database\/src\/query\//,
    { tier: 1, name: 'Query Engine API (strapi.db.query) — see open question in skill' },
  ],
  // The database layer and the automatic data migrations Strapi runs on upgrade are Tier 3:
  // a transparent migration requires no user action, so it is not breaking.
  [/^packages\/core\/database\//, { tier: 3, name: 'database layer' }],
  [/^packages\/.*\/package\.json$/, { tier: 2, name: 'package manifest / export map' }],
  // Only the entry file of a provider is its interface (see `classifyPath`).
  [/^packages\/providers\//, { tier: 3, name: 'provider internals' }],
  [
    /^packages\/(cli\/|core\/strapi\/src\/cli\/)/,
    {
      tier: 2,
      name: 'CLI internals — confirm documented commands, flags and output are unchanged',
    },
  ],
  [
    /^packages\/plugins\/graphql\//,
    { tier: 2, name: 'GraphQL plugin internals — confirm the generated schema is unchanged' },
  ],
  [
    /^packages\/.*\/src\/(index|admin|strapi-server|strapi-admin)\.[cm]?[jt]sx?$/,
    { tier: 2, name: 'package public exports' },
  ],
  [/^packages\//, { tier: 3, name: 'package internals' }],
];

const PUBLIC_EXPORTS: Surface = { tier: 2, name: 'package public exports' };
const PROVIDER_INTERFACE: Surface = { tier: 1, name: 'provider interface' };
const CLI_ENTRY: Surface = { tier: 1, name: 'CLI binary' };

export const classifyPath = (
  filePath: string,
  published: PublishedFiles = emptyPublishedFiles()
): Surface | null => {
  if (IGNORED.some((pattern) => pattern.test(filePath)) === true) {
    return null;
  }

  if (published.bins.has(filePath) === true) {
    return CLI_ENTRY;
  }

  const match = RULES.find(([pattern]) => pattern.test(filePath));
  const surface = match === undefined ? null : match[1];

  if (published.entries.has(filePath) === false) {
    return surface;
  }

  if (filePath.startsWith('packages/providers/') === true) {
    return PROVIDER_INTERFACE;
  }

  // An entry file keeps a more severe path tier (e.g. @strapi/types) and is otherwise
  // at least Tier 2: it is what consumers import.
  return surface !== null && surface.tier <= PUBLIC_EXPORTS.tier ? surface : PUBLIC_EXPORTS;
};

const toRepoPath = (packageDir: string, relative: string): string =>
  path.posix.normalize(path.posix.join(packageDir, relative));

const collectSourceConditions = (value: unknown, into: string[]): void => {
  if (typeof value !== 'object' || value === null) {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (key === 'source' && typeof nested === 'string') {
      into.push(nested);
    } else {
      collectSourceConditions(nested, into);
    }
  }
};

/**
 * Adds the entry and bin files a manifest publishes to `published`. Wildcard subpaths
 * (`"./*"`) are skipped: they publish the whole tree, which the path rules already cover.
 */
export const addPublishedFiles = (
  published: PublishedFiles,
  manifestPath: string,
  manifest: Record<string, unknown>
): void => {
  const packageDir = path.posix.dirname(manifestPath);
  const sources: string[] = [];

  if (typeof manifest.source === 'string') {
    sources.push(manifest.source);
  }

  collectSourceConditions(manifest.exports, sources);

  for (const source of sources) {
    if (source.includes('*') === false) {
      const entry = toRepoPath(packageDir, source);

      published.entries.add(entry);
      // The bundler resolves a `.js` source to its `.ts` sibling (e.g. @strapi/admin's
      // `./strapi-server` names `server/src/index.js`, the file is `index.ts`).
      if (/\.[cm]?js$/.test(entry) === true) {
        published.entries.add(entry.replace(/\.([cm]?)js$/, '.$1ts'));
      }
    }
  }

  for (const binPath of binEntries(manifest).values()) {
    published.bins.add(toRepoPath(packageDir, binPath));
  }
};

/**
 * Severity wins: a finding keeps its path tier unless the specific rule is more severe.
 * Tier 1 is the most severe, so the lower number wins.
 */
export const mergeTier = (pathTier: Tier, ruleTier: Tier): Tier =>
  Math.min(pathTier, ruleTier) as Tier;

/* -------------------------------------------------------------------------- */
/* package.json manifests                                                     */
/* -------------------------------------------------------------------------- */

type Json = Record<string, unknown>;

/**
 * A manifest/schema field is typed `unknown` — it may not be a string at runtime. Plain
 * `String()` on a non-primitive just yields "[object Object]", so fall back to JSON for
 * anything that isn't already a string.
 */
const describeValue = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value);

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

const diffExportSubpaths = (
  beforeExports: Map<string, string>,
  afterExports: Map<string, string>
): Omit<Finding, 'path' | 'surface'>[] => {
  const findings: Omit<Finding, 'path' | 'surface'>[] = [];

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

  return findings;
};

const diffEngines = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  const beforeEngines = (before.engines as Json | undefined)?.node;
  const afterEngines = (after.engines as Json | undefined)?.node;

  if (beforeEngines === undefined || afterEngines === beforeEngines) {
    return [];
  }

  return [
    {
      tier: 1,
      rule: 'engines:changed',
      detail: `engines.node changed from "${describeValue(beforeEngines)}" to "${describeValue(afterEngines)}" — confirm whether this narrows supported versions; dropping one still supported upstream is a Tier 1 break`,
    },
  ];
};

const diffPeerDependencies = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  const findings: Omit<Finding, 'path' | 'surface'>[] = [];
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
        detail: `peerDependency "${name}" moved from "${describeValue(range)}" to "${describeValue(afterPeers[name])}" — confirm whether this narrows supported versions; narrowing forces users to upgrade`,
      });
    }
  }

  return findings;
};

/**
 * `bin` is either a single path, published under the package name without its scope, or
 * a map of command name to path. Normalise both to the map form.
 */
export const binEntries = (manifest: Json): Map<string, string> => {
  const bin = manifest.bin;

  if (typeof bin === 'string') {
    const name = typeof manifest.name === 'string' ? manifest.name.replace(/^@[^/]+\//, '') : '';

    return new Map([[name, bin]]);
  }

  if (typeof bin !== 'object' || bin === null) {
    return new Map();
  }

  return new Map(
    Object.entries(bin as Json).filter((entry): entry is [string, string] => {
      return typeof entry[1] === 'string';
    })
  );
};

const diffBins = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  const findings: Omit<Finding, 'path' | 'surface'>[] = [];
  const afterBins = binEntries(after);

  for (const [name, binPath] of binEntries(before)) {
    const next = afterBins.get(name);

    if (next === undefined) {
      findings.push({
        tier: 1,
        rule: 'bin:removed',
        detail: `CLI binary "${name}" was removed — the CLI is documented and therefore Tier 1`,
      });
    } else if (next !== binPath) {
      findings.push({
        tier: 2,
        rule: 'bin:changed-path',
        detail: `CLI binary "${name}" now points at "${next}" instead of "${binPath}" — confirm the new file is published and executable`,
      });
    }
  }

  return findings;
};

const diffPackageName = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => {
  if (before.name === undefined || after.name === before.name) {
    return [];
  }

  return [
    {
      tier: 1,
      rule: 'manifest:renamed',
      detail: `package renamed from "${describeValue(before.name)}" to "${describeValue(after.name)}"`,
    },
  ];
};

/**
 * Removed or renamed export subpaths, removed export conditions, narrowed engines,
 * tightened peer dependencies, removed bins. All of these break consumers at
 * install- or build-time rather than at runtime, so they are cheap to detect and
 * expensive to miss.
 */
export const diffManifest = (before: Json, after: Json): Omit<Finding, 'path' | 'surface'>[] => [
  ...diffExportSubpaths(exportSubpaths(before), exportSubpaths(after)),
  ...diffEngines(before, after),
  ...diffPeerDependencies(before, after),
  ...diffBins(before, after),
  ...diffPackageName(before, after),
];

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
      detail: `kind changed from "${describeValue(before.kind)}" to "${describeValue(after.kind)}" — the Content API route shape changes with it`,
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
  /export\s+(?:(?:declare|default|async)\s+)*(?:const|let|var|function\*?|class|type|interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  /export\s+\{([^}]*)\}/g,
];

/**
 * The name an `export { ... }` list entry exposes, e.g. "Foo as Bar" -> "Bar", "type Foo" -> "Foo".
 * Whitespace is collapsed before splitting on the literal " as " so the parser never needs two
 * adjacent unbounded `\s+` quantifiers around a shared separator.
 */
const exposedName = (entry: string): string => {
  const normalized = entry.trim().replace(/\s+/g, ' ');
  const parts = normalized.split(' as ');

  return (parts[1] ?? parts[0]).replace(/^type\s+/, '');
};

/** Best-effort set of identifiers a module exports. Regex-based: approximate by design. */
export const collectNamedExports = (source: string): Set<string> => {
  const names = new Set<string>();

  for (const match of source.matchAll(NAMED_EXPORT_PATTERNS[0])) {
    names.add(match[1]);
  }

  for (const match of source.matchAll(NAMED_EXPORT_PATTERNS[1])) {
    for (const entry of match[1].split(',')) {
      const exposed = exposedName(entry);

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
      if (exposedName(entry) === 'default') {
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
      // A served endpoint is at least Tier 2. The path rules decide whether it is a
      // Content API route (Tier 1) or an Admin API route (Tier 2), see `mergeTier`.
      tier: 2 as Tier,
      rule: 'routes:removed-path',
      detail: `route "${routePath}" is gone — confirm the route type and its documentation status on docs.strapi.io`,
    }));
};
