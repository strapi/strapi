/**
 * Shared types for the `workspace-packages` plugin (server side) and the components that read its
 * global data (client side). Type-only module: safe to import from both sides.
 */

export type PackageGroupId =
  | 'core'
  | 'plugins'
  | 'providers'
  | 'utils'
  | 'cli'
  | 'generators'
  | 'other';

export type PackageGroup = {
  id: PackageGroupId;
  label: string;
  /** Sidebar position of the group folder in the "Packages" sidebar. */
  position: number;
};

export type WorkspacePackage = {
  /** npm name, e.g. `@strapi/database`. */
  name: string;
  version: string;
  description: string;
  private: boolean;
  /** Repo-relative POSIX directory, e.g. `packages/core/database`. */
  path: string;
  group: PackageGroupId;
};

export type DependencyKind = 'prod' | 'dev' | 'peer';

/** `source` depends on `target`. Only edges between workspace packages are kept. */
export type PackageEdge = {
  source: string;
  target: string;
  kind: DependencyKind;
};

export type DocStatus = 'stub' | 'draft' | 'needs-review';

export type FlaggedDoc = {
  id: string;
  title: string;
  permalink: string;
  status: DocStatus;
  reviewNotes: string[];
  package?: string;
};

export type PackageDoc = {
  permalink: string;
  status?: DocStatus;
};

export type WorkspacePackagesGlobalData = {
  groups: PackageGroup[];
  packages: WorkspacePackage[];
  edges: PackageEdge[];
  /** Docs carrying a `status` frontmatter value. */
  docs: FlaggedDoc[];
  /** Docs declaring a `package` frontmatter value, keyed by npm name. */
  packageDocs: Record<string, PackageDoc>;
};
