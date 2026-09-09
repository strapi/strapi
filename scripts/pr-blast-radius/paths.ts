import type { ChangedFile } from './types';
export type SensitivitySignal =
  | 'authentication'
  | 'permissions'
  | 'migrations'
  | 'database-persistence'
  | 'public-types'
  | 'release-tooling'
  | 'shared-test-infrastructure'
  | 'workflow-changes';
const global: Array<[string, RegExp]> = [
  [
    'root-package-metadata',
    /^(package\.json|yarn\.lock|\.yarnrc\.yml|\.npmrc|\.nvmrc|\.syncpackrc\.json|lerna\.json)$/,
  ],
  ['workspace-package-manifest', /^packages\/.*\/package\.json$/],
  ['workspace-build-graph', /^(nx\.json|\.nxignore|rollup\.utils\.mjs)$/],
  ['workflow-definition', /^\.github\/(workflows\/.*|filters\.yaml)$/],
  ['shared-install-build-action', /^\.github\/actions\/(yarn-nm-install|run-build)\//],
  ['yarn-installation-data', /^\.yarn\//],
];
const nonRuntime = [
  /^docs\//,
  /\.mdx?$/,
  /^LICENSE(?:\.|$)/,
  /^\.github\//,
  /^tests\//,
  /\/__(tests|snapshots)__\//,
  /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /^examples\//,
  /^scripts\//,
  /^\.changeset\//,
  /^(\.coderabbit\.yaml|\.commitlintrc\.ts|\.editorconfig|\.gitattributes|\.gitignore|\.prettierignore|\.prettierrc\.js|codecov\.yml|sonar-project\.properties|lint-staged\.(config|shared)\.mjs|fileTransformer\.js|jest(-preset|\.config\.).*\.js|playwright\.base\.config\.js|vitest\.config\.ts|docker-compose\.(test|dev)\.yml|jsconfig\.json)$/,
];
export const analysisPaths = (files: readonly ChangedFile[]) =>
  [
    ...new Set(
      files.flatMap((file) => (file.previousPath ? [file.path, file.previousPath] : [file.path]))
    ),
  ].sort();
export const globalCategories = (path: string) =>
  global.filter(([, pattern]) => pattern.test(path)).map(([name]) => name);
export const isNonRuntimePath = (path: string) =>
  !globalCategories(path).length && nonRuntime.some((pattern) => pattern.test(path));
const tokens = (path: string) =>
  path
    .split('/')
    .flatMap((segment) => segment.split(/[._-]/))
    .filter(Boolean)
    .map((token) => token.toLowerCase());
export function sensitivitySignals(paths: readonly string[]): SensitivitySignal[] {
  const result = new Set<SensitivitySignal>();
  const has = (path: string, allowed: string[]) =>
    tokens(path).some((token) => allowed.includes(token));
  for (const path of paths) {
    if (
      path.startsWith('packages/plugins/users-permissions/') ||
      has(path, ['auth', 'authentication', 'jwt', 'oauth', 'sso', 'session', 'sessions'])
    )
      result.add('authentication');
    if (
      /^packages\/(core\/permissions|plugins\/users-permissions)\//.test(path) ||
      has(path, ['permission', 'permissions', 'rbac'])
    )
      result.add('permissions');
    if (
      /^packages\/.*\/migrations\//.test(path) ||
      path.startsWith('tests/migration/') ||
      /^examples\/complex\/(docker-compose\.dev\.yml|package\.json|(?:config|scripts|src)\/)/.test(
        path
      ) ||
      has(path, ['migration', 'migrations'])
    )
      result.add('migrations');
    if (
      path.startsWith('packages/core/database/') ||
      path.endsWith('.sql') ||
      has(path, [
        'database',
        'db',
        'persistence',
        'repository',
        'repositories',
        'transaction',
        'transactions',
      ])
    )
      result.add('database-persistence');
    if (
      path.startsWith('packages/core/types/') ||
      /^packages\/.*\/(types\/|src\/types(?:\/|\.(ts|js)$)|shared\/types\.(ts|js)$)/.test(path) ||
      /^packages\/.*\.d\.ts$/.test(path)
    )
      result.add('public-types');
    if (
      /^(\.changeset\/|scripts\/(release\.js|publish\.sh|pre-publish\.sh|remove-dist-tag\.sh)$|\.github\/workflows\/(publish-.*\.yml|.*release.*\.yml)$)/.test(
        path
      )
    )
      result.add('release-tooling');
    if (
      /^(tests\/|packages\/(admin-test-utils|utils\/(api-tests|vitest-config))\/|\.github\/actions\/run-.*-tests\/)/.test(
        path
      ) ||
      /^(fileTransformer\.js|jest(-preset|\.config\.).*\.js|playwright\.base\.config\.js|vitest\.config\.ts|docker-compose\.test\.yml)$/.test(
        path
      )
    )
      result.add('shared-test-infrastructure');
    if (/^\.github\/(workflows\/|actions\/|scripts\/|filters\.yaml$|dependabot\.yml$)/.test(path))
      result.add('workflow-changes');
  }
  return [...result].sort();
}
