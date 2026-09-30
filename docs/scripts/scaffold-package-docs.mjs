#!/usr/bin/env node
/**
 * Creates a stub doc page for every workspace package under `packages/` that has none yet:
 * `docs/docs/<repo path>/index.md` (e.g. `docs/docs/packages/core/database/index.md`), plus the
 * `_category_.json` of each group folder. A package counts as documented when its `index.md` or
 * `index.mdx` exists, or when any page under `docs/docs/` declares it in its `package` frontmatter.
 * Idempotent: existing files are never touched.
 *
 * Usage (from `docs/`): `yarn scaffold:packages`
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PACKAGE_GROUPS } from '../plugins/workspace-packages/groups.mjs';
import { readWorkspacePackages } from '../plugins/workspace-packages/workspaces.mjs';

/** @typedef {import('../plugins/workspace-packages/types').WorkspacePackage} WorkspacePackage */

const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(siteDir, '..');
const contentDir = path.join(siteDir, 'docs');

const MISSING_DESCRIPTION = 'No description in package.json yet.';

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---/;
// `package: '@strapi/database'`, `package: "@strapi/database"` or unquoted.
const PACKAGE_FIELD = /^package:[ \t]*(['"]?)(.+?)\1[ \t]*$/m;

const SECTIONS = [
  ['Purpose', 'What problem this package solves, and who relies on it.'],
  [
    'Key concepts',
    'The main abstractions and terms a contributor needs before changing the code. Link to the sub-pages of the package.',
  ],
  [
    'Related',
    'Architecture pages and sibling packages. The package header already lists dependencies and dependents.',
  ],
];

/**
 * Quoted YAML scalar, safe for values starting with `@` or containing `:` or `#`. Uses the same
 * quote style as Prettier: single quotes, double quotes when the value contains a single quote.
 *
 * @param {string} value
 */
const yamlString = (value) => {
  if (value.includes("'") === true && value.includes('"') === false) {
    return `"${value.replaceAll('\\', '\\\\')}"`;
  }

  return `'${value.replaceAll("'", "''")}'`;
};

/**
 * @param {WorkspacePackage} pkg
 * @returns {string}
 */
const renderPackagePage = (pkg) => {
  const hasDescription = pkg.description !== '';
  const frontMatter = [
    `title: ${yamlString(pkg.name)}`,
    `sidebar_label: ${yamlString(path.posix.basename(pkg.path))}`,
    `description: ${yamlString(hasDescription === true ? pkg.description : MISSING_DESCRIPTION)}`,
    `package: ${yamlString(pkg.name)}`,
    'status: stub',
    ...(hasDescription === true
      ? []
      : ['review_notes:', `  - ${yamlString('package.json has no description.')}`]),
  ];
  const body = SECTIONS.map(([heading, guidance]) => `## ${heading}\n\n_${guidance}_\n`);

  return `---\n${frontMatter.join('\n')}\n---\n\n${body.join('\n')}`;
};

/**
 * npm names declared in the `package` frontmatter of any page under `docs/docs/`.
 *
 * @returns {Set<string>}
 */
const readDocumentedPackageNames = () => {
  /** @type {Set<string>} */
  const names = new Set();

  for (const relativePath of fs.readdirSync(contentDir, { recursive: true })) {
    if (/\.mdx?$/.test(relativePath) === false) {
      continue;
    }

    const frontMatter = FRONT_MATTER.exec(
      fs.readFileSync(path.join(contentDir, relativePath), 'utf8')
    );
    const field = frontMatter === null ? null : PACKAGE_FIELD.exec(frontMatter[1]);

    if (field !== null) {
      names.add(field[2]);
    }
  }

  return names;
};

/**
 * @param {string} filePath
 * @param {string} content
 * @returns {boolean} `true` when the file was created
 */
const writeIfMissing = (filePath, content) => {
  if (fs.existsSync(filePath) === true) {
    return false;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);

  return true;
};

const { packages } = readWorkspacePackages(repoRoot);
/** @type {string[]} */
const created = [];

for (const group of PACKAGE_GROUPS) {
  if (group.id === 'other' || packages.some((pkg) => pkg.group === group.id) === false) {
    continue;
  }

  const categoryPath = path.join(contentDir, 'packages', group.id, '_category_.json');
  const category = {
    label: group.label,
    position: group.position,
    link: {
      type: 'generated-index',
      slug: `/packages/${group.id}`,
      description: `Workspace packages under packages/${group.id}/ in the monorepo.`,
    },
  };

  if (writeIfMissing(categoryPath, `${JSON.stringify(category, null, 2)}\n`) === true) {
    created.push(categoryPath);
  }
}

const documentedNames = readDocumentedPackageNames();

for (const pkg of packages) {
  const pageDir = path.join(contentDir, pkg.path);
  const isDocumented =
    documentedNames.has(pkg.name) === true ||
    fs.existsSync(path.join(pageDir, 'index.mdx')) === true;

  if (isDocumented === true) {
    continue;
  }

  const pagePath = path.join(pageDir, 'index.md');

  if (writeIfMissing(pagePath, renderPackagePage(pkg)) === true) {
    created.push(pagePath);
  }
}

if (created.length === 0) {
  console.log(`All ${packages.length} workspace packages already have a doc page.`);
} else {
  console.log(`Created ${created.length} file(s):`);
  created.forEach((filePath) => console.log(`  ${path.relative(repoRoot, filePath)}`));
}
