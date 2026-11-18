import { usePluginData } from '@docusaurus/useGlobalData';

import type {
  DependencyKind,
  DocStatus,
  PackageEdge,
  PackageGroup,
  WorkspacePackage,
  WorkspacePackagesGlobalData,
} from '@site/plugins/workspace-packages/types';

export const GITHUB_TREE_URL = 'https://github.com/strapi/strapi/tree/develop';
export const PACKAGE_MAP_PATH = '/architecture/package-map';
export const DOCS_HEALTH_PATH = '/contributing/docs-health';

/** A doc status, or the state of a package page: `documented` (no status) or `missing`. */
export type DocState = DocStatus | 'documented' | 'missing';

export const DOC_STATE_LABELS: Record<DocState, string> = {
  stub: 'Stub',
  draft: 'Draft',
  'needs-review': 'Needs review',
  documented: 'Documented',
  missing: 'No page',
};

export const useWorkspacePackages = (): WorkspacePackagesGlobalData =>
  // Global data is untyped; its shape is set by `plugins/workspace-packages`.
  usePluginData('workspace-packages') as WorkspacePackagesGlobalData;

export const getPackageDocState = (
  data: WorkspacePackagesGlobalData,
  packageName: string
): DocState => {
  const doc = data.packageDocs[packageName];

  if (doc === undefined) {
    return 'missing';
  }

  return doc.status ?? 'documented';
};

/** A package counts as documented when its page exists and is more than a stub. */
export const isPackageDocumented = (
  data: WorkspacePackagesGlobalData,
  packageName: string
): boolean => {
  const state = getPackageDocState(data, packageName);

  return state !== 'missing' && state !== 'stub';
};

export const getPackageMapUrl = (packageName: string): string =>
  `${PACKAGE_MAP_PATH}?focus=${packageName}`;

/** Direct dependencies of `packageName` (it depends on them). */
export const getDependencies = (
  edges: PackageEdge[],
  packageName: string,
  kind: DependencyKind
): string[] =>
  edges
    .filter((edge) => edge.source === packageName && edge.kind === kind)
    .map((edge) => edge.target)
    .sort();

/** Direct dependents of `packageName` (they depend on it). */
export const getDependents = (
  edges: PackageEdge[],
  packageName: string,
  kind: DependencyKind
): string[] =>
  edges
    .filter((edge) => edge.target === packageName && edge.kind === kind)
    .map((edge) => edge.source)
    .sort();

export type PackageGroupSection = {
  group: PackageGroup;
  packages: WorkspacePackage[];
};

/** Packages grouped by folder, in sidebar order, without empty groups. */
export const getPackageSections = (data: WorkspacePackagesGlobalData): PackageGroupSection[] =>
  [...data.groups]
    .sort((a, b) => a.position - b.position)
    .map((group) => ({
      group,
      packages: data.packages
        .filter((pkg) => pkg.group === group.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'en')),
    }))
    .filter((section) => section.packages.length > 0);
