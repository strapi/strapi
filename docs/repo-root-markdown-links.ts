import { existsSync, statSync } from 'fs';
import { dirname, resolve } from 'path';
import type { MarkdownConfig } from '@docusaurus/types';

const REPO_ROOT = resolve(__dirname, '..');
const GITHUB_BASE = 'https://github.com/strapi/strapi';

const DOCS_CONTENT_PREFIX = 'docs/docs/';
const DOC_FILE = /\.mdx?$/;
// Docusaurus' default number prefix (`03-testing` -> `testing`), dropped from every route segment.
const NUMBER_PREFIX = /^\d+\s*[-_.]+\s*(?=[^-_.\s])/;

/**
 * Route of a page of `docs/docs/`, following the docs plugin defaults (`routeBasePath: '/'`):
 * number prefixes are dropped, and `index`, `readme` or a file named like its folder stands for the
 * folder. A `slug` or `id` in the frontmatter is not read: the build's broken-links check fails
 * when the computed route does not exist.
 *
 * `docs/docs/contributing/03-testing/e2e/00-setup.md` -> `/contributing/testing/e2e/setup`
 */
const getDocRoute = (docPath: string): string => {
  const segments = docPath
    .replace(DOC_FILE, '')
    .split('/')
    .map((segment) => segment.replace(NUMBER_PREFIX, ''));
  const name = segments.pop() ?? '';
  const isFolderPage =
    name.toLowerCase() === 'index' ||
    name.toLowerCase() === 'readme' ||
    name === segments[segments.length - 1];

  return `/${(isFolderPage === true ? segments : [...segments, name]).join('/')}`;
};

// Matches markdown links with a repo-relative target, e.g. `](./docs/docs/contributing)`.
const RELATIVE_LINK = /\]\((?!https?:|mailto:|#|\/)([^)\s#]+)(#[^)\s]*)?\)/g;

/**
 * Repo-root markdown files (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`) are imported into the site
 * as partials. Their repo-relative links work on GitHub but not on the site (they resolve against
 * the page URL and fail the broken-links check). Links to a page of the site (`docs/docs/**.md(x)`)
 * become site routes. Docusaurus cannot resolve file links inside these partials (they go through
 * its fallback MDX loader, which only turns them into downloadable assets). Every other link
 * points to the `develop` branch on GitHub.
 */
export const rewriteRepoRootMarkdownLinks: NonNullable<MarkdownConfig['preprocessor']> = ({
  filePath,
  fileContent,
}) => {
  if (dirname(filePath) !== REPO_ROOT) {
    return fileContent;
  }

  return fileContent.replace(RELATIVE_LINK, (_match, target: string, hash: string | undefined) => {
    const repoPath = target.replace(/^\.\//, '');
    const suffix = hash === undefined ? '' : hash;

    if (repoPath.startsWith(DOCS_CONTENT_PREFIX) === true && DOC_FILE.test(repoPath) === true) {
      return `](${getDocRoute(repoPath.slice(DOCS_CONTENT_PREFIX.length))}${suffix})`;
    }

    const absolutePath = resolve(REPO_ROOT, repoPath);
    const isDirectory =
      existsSync(absolutePath) === true && statSync(absolutePath).isDirectory() === true;

    return `](${GITHUB_BASE}/${isDirectory === true ? 'tree' : 'blob'}/develop/${repoPath}${suffix})`;
  });
};
