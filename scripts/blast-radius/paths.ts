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
    /^(package\.json|yarn\.lock|\.yarnrc\.yml|\.npmrc|\.nvmrc|lerna\.json)$/,
  ],
  ['workspace-package-manifest', /^packages\/.*\/package\.json$/],
  ['workspace-build-graph', /^(nx\.json|\.nxignore|rollup\.utils\.mjs)$/],
  ['yarn-installation-data', /^\.yarn\//],
];
const nonRuntime = [
  /^\.github\//,
  /^tests\//,
  /^docs\//,
  /^scripts\//,
  /^examples\//,
  /\.mdx?$/,
  /\/__(tests|snapshots)__\//,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\/fixtures?\//,
  /\.d\.ts$/,
];

export const analysisPaths = (
  files: readonly Pick<ChangedFile, 'path' | 'previousPath' | 'status'>[]
) =>
  [
    ...new Set(
      files.flatMap((file) => (file.previousPath ? [file.path, file.previousPath] : [file.path]))
    ),
  ].sort();
export const globalCategories = (path: string) =>
  path.startsWith('.github/')
    ? []
    : global.filter(([, expression]) => expression.test(path)).map(([category]) => category);
export const isNonRuntimePath = (path: string) =>
  !globalCategories(path).length && nonRuntime.some((expression) => expression.test(path));

const tokens = (path: string) =>
  path
    .split('/')
    .flatMap((part) => part.split(/[._-]/))
    .filter(Boolean)
    .map((part) => part.toLowerCase());
export function sensitivitySignals(paths: readonly string[]): SensitivitySignal[] {
  const signals = new Set<SensitivitySignal>();
  const has = (path: string, values: string[]) =>
    tokens(path).some((value) => values.includes(value));
  for (const path of paths) {
    if (
      path.startsWith('packages/plugins/users-permissions/') ||
      has(path, ['auth', 'authentication', 'jwt', 'oauth', 'sso', 'session'])
    )
      signals.add('authentication');
    if (
      /^packages\/(core\/permissions|plugins\/users-permissions)\//.test(path) ||
      has(path, ['permission', 'permissions', 'rbac'])
    )
      signals.add('permissions');
    if (/^packages\/.*\/migrations\//.test(path) || has(path, ['migration', 'migrations']))
      signals.add('migrations');
    if (
      path.startsWith('packages/core/database/') ||
      path.endsWith('.sql') ||
      has(path, ['database', 'db', 'persistence', 'repository', 'transaction'])
    )
      signals.add('database-persistence');
    if (
      path.startsWith('packages/core/types/') ||
      /(^|\/)types\//.test(path) ||
      path.endsWith('.d.ts')
    )
      signals.add('public-types');
    if (
      /^(\.changeset\/|scripts\/(release|publish|pre-publish|remove-dist-tag))/.test(path) ||
      /\.github\/workflows\/.*(publish|release)/.test(path)
    )
      signals.add('release-tooling');
    if (/^(tests\/|packages\/(admin-test-utils|utils\/(api-tests|vitest-config))\/)/.test(path))
      signals.add('shared-test-infrastructure');
    if (path.startsWith('.github/')) signals.add('workflow-changes');
  }
  return [...signals].sort();
}
