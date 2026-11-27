// @ts-check
/**
 * No-code E2E: shared helpers, without dependencies and without any model call.
 *
 * - Scenarios: parse, lint and hash the Markdown files QA engineers write.
 * - Plan: which scenarios need a (re)generated spec, and which generated specs lost their scenario.
 * - Diff check: the changes an agent is allowed to make.
 *
 * Paths are repo-relative with forward slashes, unless a name says otherwise.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** @returns {Config} */
export const loadConfig = () =>
  JSON.parse(readFileSync(path.join(REPO_ROOT, 'tests-next/ui/no-code-e2e/config.json'), 'utf8'));

/**
 * @typedef {object} Config
 * @property {{ suite: string, scenarios: string, generated: string, scratch: string }} paths
 * @property {{ generate: string[], heal: string[] }} allowedPaths
 * @property {string[]} nonRegressionPaths
 * @property {Record<'generate' | 'escalate' | 'heal' | 'triage', string>} models
 * @property {Record<'generate' | 'escalate' | 'heal' | 'triage', number>} maxTurns
 * @property {Record<'generate' | 'escalate' | 'heal' | 'triage', number>} maxBudgetUsd
 * @property {{ generate: number }} attempts
 * @property {string} project
 * @property {number} repeatEach
 * @property {string[]} allowedEnv
 * @property {string[]} tiers
 * @property {{ supported: string[], known: string[] }} editions
 * @property {string[]} outOfScopeKeywords
 * @property {{ teamId: string, projectId: string }} linear
 */

/* -------------------------------------------------------------------------------------------- */
/* Scenarios                                                                                     */
/* -------------------------------------------------------------------------------------------- */

/** Section titles, in French or English, compared without case or accents. */
const SECTIONS = {
  preconditions: ['preconditions'],
  steps: ['etapes', 'steps'],
  expected: ['resultats attendus', 'expected results'],
};

const normalize = (/** @type {string} */ text) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** The hash a generated spec records: it changes when the scenario's text changes. */
export const hashScenario = (/** @type {string} */ content) =>
  createHash('sha256').update(content.replace(/\r\n/g, '\n').trim()).digest('hex').slice(0, 12);

/**
 * @typedef {object} Scenario
 * @property {string} file Repo-relative path of the `.md`.
 * @property {string} rel Path relative to the scenarios folder, without `.md`.
 * @property {string} spec Repo-relative path of the generated spec.
 * @property {string} hash
 * @property {string} content
 * @property {Record<string, string>} meta Front-matter.
 * @property {string} title
 * @property {{ preconditions?: string, steps?: string, expected?: string }} sections
 * @property {string[]} unknownSections
 * @property {boolean} hasFrontMatter
 */

/**
 * Parses a scenario. Front-matter is a flat `key: value` block; `#` starts a comment.
 * @param {string} file
 * @param {string} content
 * @param {Config} config
 * @returns {Scenario}
 */
export const parseScenario = (file, content, config) => {
  const text = content.replace(/\r\n/g, '\n');
  const rel = path.posix.relative(config.paths.scenarios, file).replace(/\.md$/, '');

  /** @type {Record<string, string>} */
  const meta = {};
  let body = text;
  const frontMatter = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (frontMatter) {
    body = text.slice(frontMatter[0].length);
    for (const line of frontMatter[1].split('\n')) {
      const match = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line.replace(/\s+#.*$/, '').trim());
      if (match) meta[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2').trim();
    }
  }

  const title = /^#\s+(.+)$/m.exec(body)?.[1].trim() ?? '';

  /** @type {Scenario['sections']} */
  const sections = {};
  const unknownSections = [];
  const parts = body.split(/^##\s+/m).slice(1);
  for (const part of parts) {
    const [heading, ...rest] = part.split('\n');
    const key = Object.entries(SECTIONS).find(([, names]) =>
      names.includes(normalize(heading))
    )?.[0];
    if (key) sections[/** @type {keyof Scenario['sections']} */ (key)] = rest.join('\n').trim();
    else unknownSections.push(heading.trim());
  }

  return {
    file,
    rel,
    spec: `${config.paths.generated}/${rel}.ui-test.ts`,
    hash: hashScenario(text),
    content: text,
    meta,
    title,
    sections,
    unknownSections,
    hasFrontMatter: !!frontMatter,
  };
};

/**
 * Lints one scenario. Errors block the generation, warnings are reported.
 * @param {Scenario} scenario
 * @param {Config} config
 */
export const lintScenario = (scenario, config) => {
  /** @type {string[]} */
  const errors = [];
  /** @type {string[]} */
  const warnings = [];
  const { meta, sections } = scenario;

  if (!scenario.hasFrontMatter)
    errors.push('Missing front-matter (a `---` block at the top of the file).');
  if (!meta.id) errors.push('Missing `id` in the front-matter.');
  else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.id))
    errors.push(`\`id\` must be kebab-case (lowercase letters, digits, dashes): "${meta.id}".`);
  if (!meta.feature) errors.push('Missing `feature` in the front-matter.');
  if (!config.tiers.includes(meta.tier))
    errors.push(`\`tier\` must be one of ${config.tiers.join(', ')}: "${meta.tier ?? ''}".`);
  if (!config.editions.known.includes(meta.edition))
    errors.push(
      `\`edition\` must be ${config.editions.known.join(' or ')}: "${meta.edition ?? ''}".`
    );
  else if (!config.editions.supported.includes(meta.edition))
    warnings.push(`The ${meta.edition} edition is not supported yet: the scenario is skipped.`);

  if (!scenario.title) errors.push('Missing title (a `# Title` line).');
  if (!sections.preconditions) errors.push('Missing or empty `## Preconditions` section.');
  if (!sections.steps) errors.push('Missing or empty `## Steps` section.');
  else if (!/^\s*\d+\.\s+\S/m.test(sections.steps))
    errors.push('`## Steps` must be a numbered list (`1. …`).');
  if (!sections.expected) errors.push('Missing or empty `## Expected results` section.');
  else if (!/^\s*[-*]\s+\S/m.test(sections.expected))
    errors.push('`## Expected results` must be a bulleted list (`- …`).');
  for (const heading of scenario.unknownSections)
    warnings.push(`Unknown section, not checked: "## ${heading}".`);

  const haystack = normalize(scenario.content);
  const hits = config.outOfScopeKeywords.filter((keyword) => haystack.includes(normalize(keyword)));
  if (hits.length)
    warnings.push(
      `May be out of the E2E scope (${hits.map((hit) => `"${hit}"`).join(', ')}): the agent decides.`
    );

  return { errors, warnings };
};

/** @param {string} dir Absolute directory. @returns {string[]} Absolute file paths. */
const walk = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
};

const toRepoPath = (/** @type {string} */ absolute) =>
  path.relative(REPO_ROOT, absolute).split(path.sep).join('/');

/** @param {Config} config @returns {Scenario[]} */
export const loadScenarios = (config) =>
  walk(path.join(REPO_ROOT, config.paths.scenarios))
    .filter((file) => file.endsWith('.md') && path.basename(file) !== 'README.md')
    .sort()
    .map((file) => parseScenario(toRepoPath(file), readFileSync(file, 'utf8'), config));

/* -------------------------------------------------------------------------------------------- */
/* Generated specs                                                                               */
/* -------------------------------------------------------------------------------------------- */

const HEADER_PATTERN = /^\/\/ no-code-e2e: scenario=(\S+) id=(\S+) hash=([0-9a-f]+)$/m;

/** The two first lines of every generated spec. */
export const specHeader = (/** @type {Scenario} */ scenario) =>
  [
    `// no-code-e2e: scenario=${scenario.file} id=${scenario.meta.id} hash=${scenario.hash}`,
    `// Generated from ${scenario.file}. Do not edit by hand: change the scenario instead.`,
  ].join('\n');

/** @param {string} content @returns {{ scenario: string, id: string, hash: string } | null} */
export const readSpecHeader = (content) => {
  const match = HEADER_PATTERN.exec(content.split('\n').slice(0, 5).join('\n'));
  return match ? { scenario: match[1], id: match[2], hash: match[3] } : null;
};

/** Writes or replaces the header of a generated spec's content. */
export const withSpecHeader = (/** @type {string} */ content, /** @type {Scenario} */ scenario) => {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  while (lines.length && /^\/\/ (no-code-e2e:|Generated from )/.test(lines[0])) lines.shift();
  return `${specHeader(scenario)}\n${lines.join('\n')}`;
};

/**
 * What a generation run has to do, from the files alone: a scenario needs a spec when its spec is
 * missing or records another hash; a generated spec whose scenario is gone is deleted. Runs are
 * idempotent, whatever triggered them.
 * @param {Config} config
 * @param {Scenario[]} [scenarios]
 */
export const plan = (config, scenarios = loadScenarios(config)) => {
  /** @type {Array<{ file: string, errors: string[], warnings: string[] }>} */
  const lint = [];
  /** @type {Scenario[]} */
  const toGenerate = [];
  /** @type {Scenario[]} */
  const upToDate = [];
  /** @type {Array<{ scenario: Scenario, reason: string }>} */
  const skipped = [];

  const ids = new Map();
  for (const scenario of scenarios) {
    const result = lintScenario(scenario, config);
    const { id } = scenario.meta;
    if (id && ids.has(id)) result.errors.push(`\`id\` "${id}" is already used by ${ids.get(id)}.`);
    if (id) ids.set(id, scenario.file);
    lint.push({ file: scenario.file, ...result });
    if (result.errors.length) continue;

    if (!config.editions.supported.includes(scenario.meta.edition)) {
      skipped.push({ scenario, reason: `${scenario.meta.edition} edition not supported yet` });
      continue;
    }
    const specFile = path.join(REPO_ROOT, scenario.spec);
    const header = existsSync(specFile) ? readSpecHeader(readFileSync(specFile, 'utf8')) : null;
    if (header?.hash === scenario.hash) upToDate.push(scenario);
    else toGenerate.push(scenario);
  }

  const scenarioFiles = new Set(scenarios.map((scenario) => scenario.file));
  const orphans = walk(path.join(REPO_ROOT, config.paths.generated))
    .filter((file) => file.endsWith('.ui-test.ts'))
    .map((file) => ({ file: toRepoPath(file), header: readSpecHeader(readFileSync(file, 'utf8')) }))
    .filter(({ header }) => header && !scenarioFiles.has(header.scenario))
    .map(({ file }) => file);

  return { lint, toGenerate, upToDate, skipped, orphans };
};

/* -------------------------------------------------------------------------------------------- */
/* Diff check                                                                                    */
/* -------------------------------------------------------------------------------------------- */

/** Minimal glob: `**` spans folders, `*` stays in one. */
export const globToRegExp = (/** @type {string} */ glob) =>
  new RegExp(
    `^${glob
      .split('**')
      .map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'))
      .join('.*')}$`
  );

export const matchesAny = (/** @type {string} */ file, /** @type {string[]} */ globs) =>
  globs.some((glob) => globToRegExp(glob).test(file));

/** Patterns a generated or healed test must not add (see the ui README: waits, skips). */
const FORBIDDEN_ADDED = [
  {
    pattern: /\b(test|describe|it)(\.describe)?\.(skip|fixme|only)\s*\(/,
    reason: 'skip / fixme / only',
  },
  { pattern: /\bdescribeOnCondition\b/, reason: 'describeOnCondition (conditional skip)' },
  {
    pattern: /\btest\.skip\s*\(\s*[^'"`]|\b(testInfo|test\.info\(\))\.skip\b/,
    reason: 'conditional skip',
  },
  { pattern: /waitForTimeout\s*\(/, reason: 'waitForTimeout' },
  { pattern: /['"]networkidle['"]/, reason: "waitForLoadState('networkidle')" },
];

/**
 * @typedef {object} FileChange
 * @property {string} path
 * @property {'A' | 'M' | 'D' | 'R'} status
 * @property {string[]} added Added lines.
 * @property {string[]} removed Removed lines.
 */

/**
 * Checks what an agent changed. Pure: the CLI feeds it from git.
 * @param {object} input
 * @param {'generate' | 'heal'} input.mode
 * @param {FileChange[]} input.changes
 * @param {Config} input.config
 * @param {string[]} [input.regenerated] Specs regenerated from a changed scenario: their old
 *   assertions may go, since the scenario changed.
 * @returns {string[]} Violations, empty when the diff is allowed.
 */
export const checkChanges = ({ mode, changes, config, regenerated = [] }) => {
  /** @type {string[]} */
  const violations = [];
  const allowed = config.allowedPaths[mode];
  const isTest = (/** @type {string} */ file) => file.endsWith('.ui-test.ts');
  const isGenerated = (/** @type {string} */ file) => file.startsWith(`${config.paths.generated}/`);

  for (const change of changes) {
    const { path: file } = change;
    if (file.startsWith(`${config.paths.scratch}/`)) {
      violations.push(`${file}: scratch file (_scratch) left in the diff.`);
      continue;
    }
    if (!matchesAny(file, allowed)) {
      violations.push(`${file}: path not allowed in ${mode} mode.`);
      continue;
    }
    if (change.status === 'D' && !(mode === 'generate' && isGenerated(file))) {
      violations.push(`${file}: deletion not allowed.`);
    }

    if (!/\.(ts|js|mjs|cjs)$/.test(file)) continue;

    for (const line of change.added) {
      for (const { pattern, reason } of FORBIDDEN_ADDED) {
        if (pattern.test(line)) violations.push(`${file}: forbidden (${reason}): ${line.trim()}`);
      }
      for (const [, name] of line.matchAll(/process\.env\.([A-Za-z_]\w*)/g)) {
        if (!config.allowedEnv.includes(name))
          violations.push(`${file}: environment variable not allowed: ${name}`);
      }
      if (/process\.env\[/.test(line))
        violations.push(`${file}: dynamic process.env access: ${line.trim()}`);
    }

    // Assertions belong to the scenario: only a spec regenerated from a changed scenario may
    // lose some. A healer never removes or rewrites one.
    const mayDropAssertions = mode === 'generate' && regenerated.includes(file);
    if (isTest(file) && !mayDropAssertions) {
      const removedAssertions = change.removed.filter((line) =>
        /\bexpect(\.soft)?\s*\(/.test(line)
      );
      for (const line of removedAssertions)
        violations.push(`${file}: assertion removed or changed: ${line.trim()}`);
    }
  }
  return violations;
};

/**
 * Parses `git diff --unified=0 --no-color` output into file changes.
 * @param {string} diff
 * @param {Map<string, FileChange['status']>} statuses From `git diff --name-status`.
 * @returns {FileChange[]}
 */
export const parseUnifiedDiff = (diff, statuses) => {
  /** @type {Map<string, FileChange>} */
  const files = new Map();
  for (const [file, status] of statuses)
    files.set(file, { path: file, status, added: [], removed: [] });

  /** @type {FileChange | undefined} */
  let current;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = undefined;
      continue;
    }
    if (line.startsWith('+++ ')) {
      const target = line.slice(4).replace(/^b\//, '');
      current = target === '/dev/null' ? current : files.get(target);
      continue;
    }
    if (line.startsWith('--- ')) {
      const source = line.slice(4).replace(/^a\//, '');
      if (source !== '/dev/null') current = files.get(source) ?? current;
      continue;
    }
    if (!current || line.startsWith('@@')) continue;
    if (line.startsWith('+')) current.added.push(line.slice(1));
    else if (line.startsWith('-')) current.removed.push(line.slice(1));
  }
  return [...files.values()];
};
