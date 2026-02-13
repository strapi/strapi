#!/usr/bin/env node

'use strict';

/**
 * Ensures every package.json under packages/ is aligned:
 * - Monorepo package versions and deps on them use the same 5.x version.
 * - Other deps: expected version is per (name, major); only same-major is aligned.
 * - Range-only mismatches are warnings. Use --fix to update; --include-ranges to fix ranges too.
 */

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const semver = require('semver');
const { minimatch } = require('minimatch');
const { program } = require('commander');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');
const DEP_SECTIONS = ['dependencies', 'devDependencies'];

/** Sentinel: user chose to leave dependency version unchanged */
const LEAVE_AS_IS = Symbol('leave-as-is');

const TTY = process.stderr.isTTY;
const red = (s) => (TTY ? `\x1b[31m${s}\x1b[0m` : s);
const yellow = (s) => (TTY ? `\x1b[33m${s}\x1b[0m` : s);

/** Normalize option to array (single value or already array) */
const toArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);
/** Commander collect function for repeatable options */
const collectArray = (val, memo) => (memo ?? []).concat(val);

/** Recursively find all package.json paths under dir, skipping node_modules */
function findPackageJsonFiles(dir, list = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.name === 'node_modules') continue;
    if (e.isDirectory()) {
      findPackageJsonFiles(full, list);
    } else if (e.name === 'package.json') {
      list.push(full);
    }
  }
  return list;
}

/** True if current and target are different major (by semver). */
const isMajorVersionChange = (cur, tgt) =>
  semver.valid(semver.coerce(cur)) &&
  semver.valid(semver.coerce(tgt)) &&
  semver.major(semver.coerce(cur)) !== semver.major(semver.coerce(tgt));

/** True if value looks like an exact version (no workspace:, npm:, or range prefix) */
function isExactVersion(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.startsWith('workspace:')) return false;
  if (value.startsWith('npm:')) return false;
  if (
    value.startsWith('^') ||
    value.startsWith('~') ||
    value.startsWith('>') ||
    value.startsWith('>=')
  )
    return false;
  return true;
}

/** Sort version strings by semver ascending; non-semver fall back to string compare */
function sortVersions(versions) {
  return [...versions].sort((a, b) => {
    const va = semver.coerce(a);
    const vb = semver.coerce(b);
    if (semver.valid(va) && semver.valid(vb)) return semver.compare(va, vb);
    return String(a).localeCompare(String(b));
  });
}

/** Group version->count map by major; returns Map(majorNum, Map(version, count)). */
function groupVersionCountsByMajor(versionCounts) {
  const byMajor = new Map();
  for (const [version, count] of versionCounts) {
    const v = semver.coerce(version);
    const major = semver.valid(v) ? semver.major(v) : 'other';
    if (!byMajor.has(major)) byMajor.set(major, new Map());
    byMajor.get(major).set(version, count);
  }
  return byMajor;
}

/**
 * Choose expected version: alignable => strapi; else majority (by count) then newest semver on tie.
 */
function chooseExpectedVersionCommon(
  depName,
  versionCounts,
  alignablePackageNames,
  strapiExpectedVersion
) {
  if (alignablePackageNames.has(depName)) return strapiExpectedVersion;
  const versions = [...versionCounts.entries()];
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0][0];
  const exact = versions.filter(([v]) => isExactVersion(v) && semver.valid(semver.coerce(v)));
  const use = exact.length > 0 ? exact : versions;
  const byCount = (a, b) => b[1] - a[1];
  const bySemverNewestFirst = (a, b) =>
    semver.gt(semver.coerce(a[0]), semver.coerce(b[0])) ? -1 : 1;
  const sorted = use
    .slice()
    .sort((a, b) => (byCount(a, b) !== 0 ? byCount(a, b) : bySemverNewestFirst(a, b)));
  return sorted[0][0];
}

/**
 * Choose expected version: alignable => strapi; else newest by semver among all versions.
 */
function chooseExpectedVersionLatest(
  depName,
  versionCounts,
  alignablePackageNames,
  strapiExpectedVersion
) {
  if (alignablePackageNames.has(depName)) return strapiExpectedVersion;
  const versions = [...versionCounts.keys()];
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];
  const sorted = sortVersions(versions);
  return sorted[sorted.length - 1];
}

/** Prompt to pick a version or leave as-is. isMajorChange: put Leave as-is first. Returns version, LEAVE_AS_IS, or null. */
async function promptVersionChoice(depName, versionList, isMajorChange = false) {
  if (!process.stdin.isTTY) return null;
  const leaveAsIs = { name: 'Leave as-is (do not change)', value: LEAVE_AS_IS };
  const versionChoices = versionList.map((v) => ({ name: v, value: v }));
  const choices = isMajorChange
    ? [leaveAsIs, new inquirer.Separator(), ...versionChoices]
    : [
        ...(versionList.length
          ? [
              {
                name: versionList[versionList.length - 1],
                value: versionList[versionList.length - 1],
              },
            ]
          : []),
        ...(versionList.length > 1
          ? versionList.slice(0, -1).map((v) => ({ name: v, value: v }))
          : []),
        new inquirer.Separator(),
        leaveAsIs,
      ];
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: `Standardize "${depName}" on which version?`,
      choices,
      pageSize: Math.max(10, choices.length + 2),
    },
  ]);
  return choice;
}

/** Get all dependency entries from a package.json (dependencies + devDependencies) */
function getAllDeps(pkg) {
  const entries = [];
  for (const section of DEP_SECTIONS) {
    const deps = pkg[section];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, value] of Object.entries(deps)) {
      entries.push({ name, value });
    }
  }
  return entries;
}

/** Return 1-based line number for the line containing key (e.g. "version" or "lodash"), or null */
function getLineForKey(content, key) {
  const lines = content.split('\n');
  const i = lines.findIndex((line) => line.includes(`"${key}"`) && line.includes(':'));
  return i === -1 ? null : i + 1;
}

/** Format item for editor-friendly output (path:line or path) */
function formatLoc(item) {
  return item.lineNumber != null ? `${item.relativePath}:${item.lineNumber}` : item.relativePath;
}

/** Attach lineNumber to each error and warning using shared file reads */
function attachLineNumbers(errors, warnings) {
  const fileContents = new Map();
  const addLine = (item, key) => {
    if (!fileContents.has(item.filePath)) {
      fileContents.set(item.filePath, fs.readFileSync(item.filePath, 'utf8'));
    }
    item.lineNumber = getLineForKey(fileContents.get(item.filePath), key);
  };
  for (const e of errors) {
    addLine(e, e.type === 'package-version' ? 'version' : e.depName);
  }
  for (const w of warnings) {
    addLine(w, w.depName);
  }
}

/** Print warning block (yellow, path:line format) */
function printWarnings(warnings) {
  if (warnings.length === 0) return;
  console.error(yellow(`Warning: ${warnings.length} dependency(ies) with version suggestions:\n`));
  for (const w of warnings) {
    console.error(yellow(`  ${formatLoc(w)}: ${w.message}`));
  }
  console.error('');
}

/** Attach line numbers, print warnings, print errors in red, then exit 1 */
function reportErrorsAndExit(errors, warnings) {
  attachLineNumbers(errors, warnings);
  printWarnings(warnings);
  console.error(red(`Found ${errors.length} version mismatch(es).\n`));
  console.error(red('Run with --fix to update package.json files to the expected version.\n'));
  for (const e of errors) {
    console.error(red(`${formatLoc(e)}: ${e.message}`));
  }
  console.error('');
  process.exit(1);
}

/** True if relativePath has a path segment named "templates" (e.g. .../templates/...) */
function isUnderTemplates(relativePath) {
  return relativePath.split(path.sep).includes('templates');
}

/** True if the package (directory of package.json) matches any of the glob patterns (minimatch; use / in patterns) */
function packageMatchesAny(relativePathToPackageJson, patterns) {
  if (!patterns || patterns.length === 0) return false;
  const packageDir = path.dirname(relativePathToPackageJson).split(path.sep).join('/');
  return patterns.some((p) => minimatch(packageDir, p, { matchBase: true }));
}

async function runChecks(options) {
  const {
    listDeps,
    fix,
    preferLatest,
    preferCommon,
    includeTemplates,
    includeRanges,
    matchMajors,
    include,
    exclude,
  } = options;

  const packagePaths = findPackageJsonFiles(PACKAGES_DIR);
  let packages = packagePaths.map((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    let pkg;
    try {
      pkg = JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing ${filePath}:`, e.message);
      process.exit(1);
    }
    return { filePath, relativePath: path.relative(REPO_ROOT, filePath), pkg };
  });
  if (!includeTemplates) {
    packages = packages.filter(({ relativePath }) => !isUnderTemplates(relativePath));
  }

  // 1) Determine expected version from @strapi/strapi (before --include/--exclude so we always have a baseline)
  const strapiPkg = packages.find(({ pkg }) => pkg.name === '@strapi/strapi');
  if (!strapiPkg) {
    console.error('Could not find @strapi/strapi package under packages/');
    process.exit(1);
  }
  const expectedVersion = strapiPkg.pkg.version;
  if (!expectedVersion) {
    console.error('@strapi/strapi has no "version" field');
    process.exit(1);
  }

  const includePatterns = toArray(include);
  const excludePatterns = toArray(exclude);
  if (includePatterns.length > 0) {
    packages = packages.filter(({ relativePath }) =>
      packageMatchesAny(relativePath, includePatterns)
    );
  }
  if (excludePatterns.length > 0) {
    packages = packages.filter(
      ({ relativePath }) => !packageMatchesAny(relativePath, excludePatterns)
    );
  }

  // Packages that are released with the main 5.x version (must align)
  const alignablePackageNames = new Set(
    packages
      .filter(({ pkg }) => pkg.version && String(pkg.version).startsWith('5.'))
      .map(({ pkg }) => pkg.name)
  );

  // Build global map: dep name -> version string -> count (number of package.json files using it)
  const depVersionCounts = new Map();
  for (const { pkg } of packages) {
    for (const { name, value } of getAllDeps(pkg)) {
      if (!depVersionCounts.has(name)) depVersionCounts.set(name, new Map());
      const counts = depVersionCounts.get(name);
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  }

  // Expected version: alignable => strapi; --match-majors => one per dep; else per (dep, major)
  const expectedByDep = new Map();
  const choose = fix && preferLatest ? chooseExpectedVersionLatest : chooseExpectedVersionCommon;
  for (const [depName, versionCounts] of depVersionCounts) {
    if (alignablePackageNames.has(depName)) {
      expectedByDep.set(depName, expectedVersion);
    } else if (matchMajors) {
      const expected = choose(depName, versionCounts, alignablePackageNames, expectedVersion);
      if (expected != null) expectedByDep.set(depName, expected);
    } else {
      for (const [major, counts] of groupVersionCountsByMajor(versionCounts)) {
        const expected = choose(depName, counts, new Set(), expectedVersion);
        if (expected != null) expectedByDep.set(`${depName}@${major}`, expected);
      }
    }
  }
  const getExpectedKey = (depName, value) =>
    alignablePackageNames.has(depName) || matchMajors
      ? depName
      : `${depName}@${semver.valid(semver.coerce(value)) ? semver.major(semver.coerce(value)) : 'other'}`;

  const errors = [];
  const warnings = [];

  // 1) Package version alignment (all 5.x packages must use expectedVersion)
  for (const { filePath, relativePath, pkg } of packages) {
    const v = pkg.version;
    if (v == null) continue;
    if (v.startsWith('5.') && v !== expectedVersion) {
      errors.push({
        type: 'package-version',
        filePath,
        relativePath,
        pkg,
        message: `Package "${pkg.name}" has version "${v}" but expected "${expectedVersion}"`,
        targetVersion: expectedVersion,
      });
    }
  }

  // 2) Each dep must match expected. Range that satisfies = warning; with --match-majors, major diff = warning.
  for (const { filePath, relativePath, pkg } of packages) {
    for (const { name, value } of getAllDeps(pkg)) {
      const targetVersion = expectedByDep.get(getExpectedKey(name, value));
      if (targetVersion == null || value === targetVersion) continue;
      const section = DEP_SECTIONS.find((s) => pkg[s]?.[name] !== undefined) ?? DEP_SECTIONS[0];
      const rangeSatisfies =
        !isExactVersion(value) &&
        semver.valid(semver.coerce(targetVersion)) &&
        semver.satisfies(targetVersion, value);
      const majorChange =
        matchMajors && !rangeSatisfies && isMajorVersionChange(value, targetVersion);
      const type = rangeSatisfies
        ? 'dep-version-range'
        : majorChange
          ? 'dep-version-major'
          : 'dep-version';
      const entry = {
        type,
        filePath,
        relativePath,
        pkg,
        section,
        depName: name,
        message: `In ${section}, "${name}" is "${value}" but expected "${targetVersion}"`,
        targetVersion,
      };
      if (type !== 'dep-version') warnings.push(entry);
      else errors.push(entry);
    }
  }

  if (listDeps) {
    console.log('# Dependencies and unified version (under packages/)\n');
    const keys = [...expectedByDep.keys()].sort();
    for (const key of keys) {
      console.log(`${key}: ${expectedByDep.get(key)}`);
    }
    if (errors.length > 0) {
      console.error('\n--- Version check errors (see above) ---');
      process.exit(1);
    }
    process.exit(0);
  }

  const fixableItems = [
    ...errors,
    ...warnings.filter((w) => w.type === 'dep-version-major'),
    ...(includeRanges ? warnings.filter((w) => w.type === 'dep-version-range') : []),
  ];

  if (errors.length === 0) {
    attachLineNumbers(errors, warnings);
    printWarnings(warnings);
    if (!fix || fixableItems.length === 0) {
      console.log('All package versions and dependency versions are aligned.');
      process.exit(0);
    }
  }

  if (fix && fixableItems.length > 0) {
    const promptMode = !preferLatest && !preferCommon;
    const majorChangeDepNames = new Set(
      fixableItems.filter((e) => e.type === 'dep-version-major').map((e) => e.depName)
    );
    if (!promptMode && majorChangeDepNames.size > 0) {
      console.error(
        red(
          `Cannot --fix: ${majorChangeDepNames.size} dependency(ies) would change major version. Run without --prefer-common/--prefer-latest to be prompted.\n`
        )
      );
      process.exit(1);
    }

    // When no --prefer-* we prompt for every fixable dep; with --prefer-* we only prompt when multiple targets or major change
    const allFixableDepNames = [
      ...new Set(fixableItems.filter((e) => e.type !== 'package-version').map((e) => e.depName)),
    ].sort();
    const targetVersionsByDep = new Map();
    for (const e of fixableItems) {
      if (e.type !== 'package-version') {
        if (!targetVersionsByDep.has(e.depName)) targetVersionsByDep.set(e.depName, new Set());
        targetVersionsByDep.get(e.depName).add(e.targetVersion);
      }
    }
    const depsNeedingChoice = promptMode
      ? allFixableDepNames
      : [
          ...new Set([
            ...fixableItems
              .filter(
                (e) => e.type !== 'package-version' && targetVersionsByDep.get(e.depName)?.size > 1
              )
              .map((e) => e.depName),
            ...majorChangeDepNames,
          ]),
        ].sort();
    let chosenVersionByDep = new Map();
    if (promptMode && depsNeedingChoice.length > 0 && process.stdin.isTTY) {
      console.error('Select version to standardize on for each dependency (0 = leave as-is):\n');
      for (const depName of depsNeedingChoice) {
        const versionList = sortVersions([...depVersionCounts.get(depName).keys()]);
        const chosen = await promptVersionChoice(
          depName,
          versionList,
          majorChangeDepNames.has(depName)
        );
        if (chosen === LEAVE_AS_IS) chosenVersionByDep.set(depName, LEAVE_AS_IS);
        else if (chosen != null) chosenVersionByDep.set(depName, chosen);
      }
    }

    const fixesByFile = new Map();
    for (const e of fixableItems) {
      if (!fixesByFile.has(e.filePath)) fixesByFile.set(e.filePath, { version: null, deps: [] });
      const entry = fixesByFile.get(e.filePath);
      if (e.type === 'package-version') {
        entry.version = e.targetVersion;
      } else {
        if (chosenVersionByDep.get(e.depName) === LEAVE_AS_IS) continue;
        // dep-version-major: only apply if user chose a version (we prompted); else skip
        if (e.type === 'dep-version-major' && !chosenVersionByDep.has(e.depName)) continue;
        const targetVersion = chosenVersionByDep.get(e.depName) ?? e.targetVersion;
        if (targetVersion !== LEAVE_AS_IS)
          entry.deps.push({ section: e.section, name: e.depName, targetVersion });
      }
    }

    // Apply fixes.
    for (const [filePath, fixes] of fixesByFile) {
      const entry = packages.find((p) => p.filePath === filePath);
      if (!entry) continue;
      const pkg = entry.pkg;
      let changed = false;
      if (fixes.version) {
        pkg.version = fixes.version;
        changed = true;
      }
      for (const { section, name, targetVersion } of fixes.deps) {
        if (pkg[section] && name in pkg[section]) {
          pkg[section][name] = targetVersion;
          changed = true;
        }
      }
      if (changed) {
        const json = JSON.stringify(pkg, null, 2) + '\n';
        fs.writeFileSync(filePath, json, 'utf8');
        console.log(`Fixed ${path.relative(REPO_ROOT, filePath)}`);
      }
    }
    console.log(`Applied fixes. Re-run without --fix to verify.`);
    console.log('');
    console.log('Run `yarn install` to update the lockfile.');
    process.exit(0);
  }

  reportErrorsAndExit(errors, warnings);
}

program
  .name('check-package-versions')
  .description(
    'Check package and dependency version alignment under packages/. Default: align per (dep, major). Use --match-majors to align repo-wide (cross-major = warning).'
  )
  .option('-l, --list-deps', 'print all dependencies and the version they are unified to')
  .option('--fix', 'update package.json files to fix version mismatches')
  .option(
    '--prefer-latest',
    'with --fix: standardize on the latest version (by semver) for each dependency'
  )
  .option(
    '--prefer-common',
    'with --fix: standardize on the most-used version, then latest on tie (default when not prompting)'
  )
  .option(
    '--include-templates',
    'include package.json files under templates/ (e.g. create-strapi-app templates); excluded by default'
  )
  .option(
    '--include-ranges',
    'with --fix: also fix dependencies that use a range (e.g. ^1.0.0) to the exact expected version'
  )
  .option(
    '--match-majors',
    'require one version per dep repo-wide (default: align per major); cross-major diffs become warnings'
  )
  .option(
    '--include <pattern>',
    'only check/fix packages matching glob pattern(s); can be repeated (e.g. --include "packages/core/*")',
    collectArray,
    []
  )
  .option(
    '--exclude <pattern>',
    'skip packages matching glob pattern(s); can be repeated (e.g. --exclude "**/templates/**")',
    collectArray,
    []
  )
  .action((options) => {
    runChecks(options).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });

program.parse();
