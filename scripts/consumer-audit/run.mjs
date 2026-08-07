#!/usr/bin/env node
/**
 * Consumer dependency audit — what a default create-strapi-app installs.
 *
 * Walks the CSA package closure from monorepo package.json files, installs the
 * declared third-party production deps with npm, captures deprecation warnings
 * + npm audit, then diffs against baseline.json.
 *
 * Usage (repo root):
 *   node scripts/consumer-audit/run.mjs
 *   node scripts/consumer-audit/run.mjs --out /tmp/consumer-audit
 *   node scripts/consumer-audit/run.mjs --no-fail
 *
 * Exit codes:
 *   0 — no new findings (or --no-fail)
 *   1 — new findings vs baseline
 *   2 — script / install error
 */

import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(__dirname, 'packages.json');
const BASELINE_PATH = path.join(__dirname, 'baseline.json');

const args = process.argv.slice(2);
const noFail = args.includes('--no-fail');
const outIdx = args.indexOf('--out');
const outDir =
  outIdx >= 0 && args[outIdx + 1]
    ? path.resolve(args[outIdx + 1])
    : path.join(ROOT, 'scripts/consumer-audit/.output');

function fail(message, code = 2) {
  console.error(`error: ${message}`);
  process.exit(code);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function workspacePackages() {
  // Prefer yarn when available (accurate workspace list); otherwise walk packages/.
  const result = spawnSync('yarn', ['workspaces', 'list', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  const byName = new Map();
  if (result.status === 0 && result.stdout.trim()) {
    for (const line of result.stdout.split('\n').filter(Boolean)) {
      const row = JSON.parse(line);
      if (row.name && row.location) {
        byName.set(row.name, path.join(ROOT, row.location));
      }
    }
    return byName;
  }

  // Fallback: no yarn install required — walk published package trees only.
  const packagesRoot = path.join(ROOT, 'packages');
  const stack = [packagesRoot];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    const pkgJsonPath = path.join(dir, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = readJson(pkgJsonPath);
        if (pkg.name) byName.set(pkg.name, dir);
      } catch {
        /* ignore malformed */
      }
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      stack.push(path.join(dir, entry.name));
    }
  }
  return byName;
}

function collectThirdPartyDeps(roots, workspaces) {
  const visited = new Set();
  const queue = [...roots];
  const thirdParty = new Map();
  const strapiVisited = [];

  while (queue.length > 0) {
    const name = queue.shift();
    if (visited.has(name)) continue;
    visited.add(name);

    const pkgDir = workspaces.get(name);
    if (!pkgDir) {
      console.warn(`warn: workspace package not found: ${name}`);
      continue;
    }

    strapiVisited.push(name);
    const pkg = readJson(path.join(pkgDir, 'package.json'));
    for (const [dep, version] of Object.entries(pkg.dependencies || {})) {
      if (dep.startsWith('@strapi/') || dep === 'strapi') {
        // In-monorepo packages are walked; published externals (design-system, icons, …)
        // are treated as third-party pins from the registry.
        if (workspaces.has(dep)) {
          queue.push(dep);
        } else if (!thirdParty.has(dep)) {
          thirdParty.set(dep, version);
        }
        continue;
      }
      // Prefer first pin seen (root-most); later pins are ignored if present
      if (!thirdParty.has(dep)) {
        thirdParty.set(dep, version);
      }
    }
  }

  return { thirdParty, strapiVisited };
}

function parseDeprecations(installLog) {
  const deprecated = new Map();
  const re = /npm warn deprecated ([^@\s]+)@([^\s:]+):\s*(.*)$/gim;
  let match;
  while ((match = re.exec(installLog)) !== null) {
    const [, name, version, message] = match;
    deprecated.set(name, { package: name, version, message: message.trim() });
  }
  // Scoped packages: npm warn deprecated @scope/name@version:
  const scopedRe = /npm warn deprecated (@[^@\s]+\/[^@\s]+)@([^\s:]+):\s*(.*)$/gim;
  while ((match = scopedRe.exec(installLog)) !== null) {
    const [, name, version, message] = match;
    deprecated.set(name, { package: name, version, message: message.trim() });
  }
  return [...deprecated.values()];
}

function leafVulnerabilities(audit) {
  const leaves = [];
  for (const [name, entry] of Object.entries(audit.vulnerabilities || {})) {
    const advisories = (entry.via || []).filter((v) => typeof v === 'object' && v.url);
    if (advisories.length === 0) continue;
    leaves.push({
      package: name,
      severity: entry.severity,
      range: entry.range,
      advisories: advisories.map((a) => ({
        title: a.title,
        url: a.url,
        severity: a.severity,
      })),
    });
  }
  return leaves;
}

function findingId(kind, pkg) {
  return `${kind}:${pkg}`;
}

function classify(findings, baseline) {
  const accepted = new Map((baseline.accepted || []).map((f) => [f.id, f]));
  const known = new Map((baseline.known || []).map((f) => [f.id, f]));
  const classified = { accepted: [], known: [], novel: [] };

  for (const finding of findings) {
    const id = finding.id;
    if (accepted.has(id)) {
      classified.accepted.push({ ...finding, baseline: accepted.get(id) });
    } else if (known.has(id)) {
      classified.known.push({ ...finding, baseline: known.get(id) });
    } else {
      classified.novel.push(finding);
    }
  }

  return classified;
}

function writeReport({ outDir: dir, meta, classified, deprecations, vulns, auditMeta }) {
  mkdirSync(dir, { recursive: true });

  const report = {
    meta,
    summary: {
      novel: classified.novel.length,
      known: classified.known.length,
      accepted: classified.accepted.length,
      deprecations: deprecations.length,
      vulnerabilities: vulns.length,
      audit: auditMeta,
    },
    novel: classified.novel,
    known: classified.known,
    accepted: classified.accepted,
  };

  writeFileSync(path.join(dir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);

  const lines = [
    '# Consumer dependency audit',
    '',
    `Generated: ${meta.generatedAt}`,
    `Node: ${meta.node} · npm: ${meta.npm}`,
    `Scratch: ${meta.scratchDir}`,
    '',
    '## Summary',
    '',
    `- Novel (fail): **${classified.novel.length}**`,
    `- Known tracked: ${classified.known.length}`,
    `- Accepted holds: ${classified.accepted.length}`,
    `- Deprecations seen: ${deprecations.length}`,
    `- Audit leaf advisories: ${vulns.length}`,
    `- npm audit totals: ${JSON.stringify(auditMeta?.vulnerabilities || {})}`,
    '',
  ];

  if (classified.novel.length > 0) {
    lines.push('## Novel findings', '');
    for (const f of classified.novel) {
      lines.push(`- \`${f.id}\` (${f.kind}${f.severity ? `, ${f.severity}` : ''})`);
      if (f.message) lines.push(`  - ${f.message}`);
      if (f.advisories) {
        for (const a of f.advisories) lines.push(`  - ${a.title} — ${a.url}`);
      }
    }
    lines.push('');
  }

  if (classified.known.length > 0) {
    lines.push('## Known (tracked)', '');
    for (const f of classified.known) {
      lines.push(`- \`${f.id}\` — ${f.baseline?.reason || ''}`);
    }
    lines.push('');
  }

  writeFileSync(path.join(dir, 'report.md'), `${lines.join('\n')}\n`);
  return report;
}

function main() {
  const config = readJson(CONFIG_PATH);
  const baseline = readJson(BASELINE_PATH);
  const workspaces = workspacePackages();

  const { thirdParty, strapiVisited } = collectThirdPartyDeps(config.roots, workspaces);
  for (const [name, version] of Object.entries(config.appDependencies || {})) {
    if (!thirdParty.has(name)) thirdParty.set(name, version);
  }

  const dependencies = Object.fromEntries(
    [...thirdParty.entries()].sort(([a], [b]) => a.localeCompare(b))
  );

  mkdirSync(outDir, { recursive: true });
  const scratchDir = mkdtempSync(path.join(tmpdir(), 'strapi-consumer-audit-'));
  const appDir = path.join(scratchDir, 'app');
  mkdirSync(appDir);

  const appPkg = {
    name: 'strapi-consumer-audit',
    version: '0.0.0',
    private: true,
    description: 'Synthetic CSA dependency closure for audit (third-party pins only)',
    dependencies,
  };
  writeFileSync(path.join(appDir, 'package.json'), `${JSON.stringify(appPkg, null, 2)}\n`);
  writeFileSync(
    path.join(outDir, 'closure.json'),
    `${JSON.stringify({ strapiPackages: strapiVisited.sort(), dependencies }, null, 2)}\n`
  );

  console.log(`==> Consumer closure: ${strapiVisited.length} @strapi packages`);
  console.log(`==> Third-party deps: ${Object.keys(dependencies).length}`);
  console.log(`==> Installing into ${appDir}`);

  // Match create-strapi-app npm installs (legacy-peer-deps).
  const install = spawnSync(
    'npm',
    ['install', '--no-fund', '--no-audit', '--ignore-scripts', '--legacy-peer-deps'],
    {
      cwd: appDir,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      env: { ...process.env, npm_config_fund: 'false', npm_config_audit: 'false' },
    }
  );

  const installLog = `${install.stdout || ''}\n${install.stderr || ''}`;
  writeFileSync(path.join(outDir, 'npm-install.log'), installLog);

  if (install.status !== 0) {
    rmSync(scratchDir, { recursive: true, force: true });
    fail(`npm install failed (exit ${install.status}). See ${path.join(outDir, 'npm-install.log')}`);
  }

  const deprecations = parseDeprecations(installLog);
  writeFileSync(path.join(outDir, 'deprecations.json'), `${JSON.stringify(deprecations, null, 2)}\n`);

  console.log('==> Running npm audit');
  const auditProc = spawnSync('npm', ['audit', '--json'], {
    cwd: appDir,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 32 * 1024 * 1024,
  });
  // npm audit exits non-zero when vulns exist
  let audit = {};
  try {
    audit = JSON.parse(auditProc.stdout || '{}');
  } catch {
    writeFileSync(path.join(outDir, 'npm-audit.raw.txt'), auditProc.stdout || auditProc.stderr || '');
    rmSync(scratchDir, { recursive: true, force: true });
    fail('failed to parse npm audit JSON');
  }
  writeFileSync(path.join(outDir, 'npm-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);

  const vulns = leafVulnerabilities(audit);
  const findings = [
    ...deprecations.map((d) => ({
      id: findingId('deprecation', d.package),
      kind: 'deprecation',
      package: d.package,
      version: d.version,
      message: d.message,
    })),
    ...vulns.map((v) => ({
      id: findingId('vulnerability', v.package),
      kind: 'vulnerability',
      package: v.package,
      severity: v.severity,
      range: v.range,
      advisories: v.advisories,
    })),
  ];

  const classified = classify(findings, baseline);

  const nodeV = spawnSync('node', ['-v'], { encoding: 'utf8' }).stdout.trim();
  const npmV = spawnSync('npm', ['-v'], { encoding: 'utf8', shell: process.platform === 'win32' })
    .stdout.trim();

  const report = writeReport({
    outDir,
    meta: {
      generatedAt: new Date().toISOString(),
      node: nodeV,
      npm: npmV,
      scratchDir,
      roots: config.roots,
    },
    classified,
    deprecations,
    vulns,
    auditMeta: audit.metadata,
  });

  // Keep install tree out of the repo; remove scratch after writing reports
  rmSync(scratchDir, { recursive: true, force: true });

  console.log('');
  console.log(`Novel: ${classified.novel.length} · Known: ${classified.known.length} · Accepted: ${classified.accepted.length}`);
  console.log(`Reports: ${path.join(outDir, 'report.md')}`);

  if (classified.novel.length > 0) {
    console.log('\nNovel findings:');
    for (const f of classified.novel) {
      console.log(`  - ${f.id}${f.severity ? ` (${f.severity})` : ''}`);
    }
    if (!noFail) {
      process.exit(1);
    }
    console.log('\n(--no-fail: not failing CI)');
  }

  // silence unused
  void report;
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(2);
}
