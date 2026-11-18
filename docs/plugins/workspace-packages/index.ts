import path from 'node:path';

import logger from '@docusaurus/logger';
import type { AllContent, LoadContext, Plugin } from '@docusaurus/types';
import type { DocMetadata, LoadedContent } from '@docusaurus/plugin-content-docs';

import { PACKAGE_GROUPS } from './groups.mjs';
import { readWorkspacePackages } from './workspaces.mjs';
import type {
  DocStatus,
  FlaggedDoc,
  PackageDoc,
  WorkspacePackage,
  WorkspacePackagesGlobalData,
} from './types';

export const PLUGIN_NAME = 'workspace-packages';

const DOCS_PLUGIN_NAME = 'docusaurus-plugin-content-docs';
const DOC_STATUSES: readonly DocStatus[] = ['stub', 'draft', 'needs-review'];
/** A page documents a package only when it is the package folder's index page. */
const PACKAGE_DOC_FILENAMES: readonly string[] = ['index.md', 'index.mdx'];

const isDocStatus = (value: unknown): value is DocStatus =>
  DOC_STATUSES.some((status) => status === value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) === true && value.every((item) => typeof item === 'string');

const getCurrentVersionDocs = (allContent: AllContent): DocMetadata[] => {
  // The docs plugin content is typed `unknown` in `AllContent`; its shape is `LoadedContent`.
  const content = allContent[DOCS_PLUGIN_NAME]?.default as LoadedContent | undefined;
  const currentVersion = content?.loadedVersions.find(
    (version) => version.versionName === 'current'
  );

  if (currentVersion === undefined) {
    throw new Error(`[${PLUGIN_NAME}] Could not find the current version of the docs plugin.`);
  }

  return currentVersion.docs;
};

type DocsIndex = {
  flaggedDocs: FlaggedDoc[];
  packageDocs: Record<string, PackageDoc>;
};

/**
 * Validates `status`, `review_notes` and `package` frontmatter and indexes the docs using them.
 * Throws a single error listing every problem so authors can fix them in one pass.
 */
const indexDocs = (docs: DocMetadata[], packages: WorkspacePackage[]): DocsIndex => {
  const packageNames = new Set(packages.map((pkg) => pkg.name));
  const errors: string[] = [];
  const flaggedDocs: FlaggedDoc[] = [];
  const packageDocs: Record<string, PackageDoc> = {};
  const packageDocSources: Record<string, string> = {};

  for (const doc of docs) {
    const { status, review_notes: reviewNotes, package: packageName } = doc.frontMatter;
    const where = `"${doc.source}"`;

    if (status !== undefined && isDocStatus(status) === false) {
      errors.push(
        `${where}: unknown status ${JSON.stringify(status)} (allowed: ${DOC_STATUSES.join(', ')}).`
      );
    }

    if (reviewNotes !== undefined) {
      if (isStringArray(reviewNotes) === false) {
        errors.push(`${where}: review_notes must be a list of strings.`);
      } else if (reviewNotes.some((note) => note.trim() === '') === true) {
        errors.push(`${where}: review_notes must not contain empty items.`);
      }

      // The banner that shows the notes only renders for a flagged page.
      if (status === undefined) {
        errors.push(
          `${where}: review_notes requires a status (allowed: ${DOC_STATUSES.join(', ')}).`
        );
      }
    }

    if (packageName !== undefined) {
      if (typeof packageName !== 'string' || packageNames.has(packageName) === false) {
        errors.push(
          `${where}: package ${JSON.stringify(packageName)} is not a workspace package under packages/.`
        );
      } else if (PACKAGE_DOC_FILENAMES.includes(path.posix.basename(doc.source)) === false) {
        errors.push(
          `${where}: package "${packageName}" can only be declared by an index page (${PACKAGE_DOC_FILENAMES.join(' or ')}).`
        );
      } else if (packageDocSources[packageName] !== undefined) {
        errors.push(
          `${where}: package "${packageName}" is already documented by "${packageDocSources[packageName]}".`
        );
      } else {
        packageDocSources[packageName] = doc.source;
        packageDocs[packageName] = {
          permalink: doc.permalink,
          ...(isDocStatus(status) === true ? { status } : {}),
        };
      }
    }

    if (isDocStatus(status) === true) {
      flaggedDocs.push({
        id: doc.id,
        title: doc.title,
        permalink: doc.permalink,
        status,
        reviewNotes: isStringArray(reviewNotes) === true ? reviewNotes : [],
        ...(typeof packageName === 'string' ? { package: packageName } : {}),
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `[${PLUGIN_NAME}] Invalid docs frontmatter:\n${errors.map((error) => `- ${error}`).join('\n')}`
    );
  }

  // Sorted by title only: grouping by status is a presentation concern (see `DocsHealth`).
  flaggedDocs.sort((a, b) => a.title.localeCompare(b.title, 'en'));

  return { flaggedDocs, packageDocs };
};

/**
 * Exposes the `packages/**` workspace graph and the docs flags (`status`, `review_notes`,
 * `package` frontmatter) as global data. See `./types.ts` for the data shape.
 */
export default function workspacePackagesPlugin(context: LoadContext): Plugin {
  const repoRoot = path.resolve(context.siteDir, '..');

  return {
    name: PLUGIN_NAME,

    async allContentLoaded({ allContent, actions }) {
      // Read here (not in `loadContent`) because this hook re-runs on every reload, including
      // after a watched `package.json` changes.
      const { packages, edges } = readWorkspacePackages(repoRoot);
      const { flaggedDocs, packageDocs } = indexDocs(getCurrentVersionDocs(allContent), packages);

      const undocumented = packages.filter((pkg) => packageDocs[pkg.name] === undefined);

      if (undocumented.length > 0) {
        logger.warn(
          `[${PLUGIN_NAME}] ${undocumented.length} workspace package(s) have no doc page (run \`yarn scaffold:packages\`): ${undocumented
            .map((pkg) => pkg.name)
            .join(', ')}`
        );
      }

      const globalData: WorkspacePackagesGlobalData = {
        groups: PACKAGE_GROUPS,
        packages,
        edges,
        docs: flaggedDocs,
        packageDocs,
      };

      actions.setGlobalData(globalData);
    },

    getPathsToWatch() {
      return readWorkspacePackages(repoRoot).manifestPaths;
    },
  };
}
