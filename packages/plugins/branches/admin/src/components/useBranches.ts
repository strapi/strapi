import * as React from 'react';

import { MAIN_SLUG } from '../constants';
import { useGetMineBranchesQuery, type Branch } from '../services/branches';
import { useCurrentBranchSlug, useSwitchBranch } from '../utils/useSwitchBranch';

/**
 * The branch list of the current workspace with the active one resolved.
 * Self-heals: a stored slug that no longer resolves (merged, deleted, other
 * workspace) silently falls back to main.
 */
export const useBranches = () => {
  const { data, isLoading } = useGetMineBranchesQuery();
  const slug = useCurrentBranchSlug();
  const switchBranch = useSwitchBranch();

  const branches = React.useMemo<Branch[]>(() => data ?? [], [data]);
  const main = branches.find((branch) => branch.slug === MAIN_SLUG) ?? null;
  const others = branches.filter((branch) => branch.slug !== MAIN_SLUG);
  const current = branches.find((branch) => branch.slug === slug) ?? main;

  React.useEffect(() => {
    if (branches.length === 0 || slug === MAIN_SLUG) {
      return;
    }
    if (!branches.some((branch) => branch.slug === slug)) {
      switchBranch(MAIN_SLUG);
    }
  }, [branches, slug, switchBranch]);

  const parentOf = React.useCallback(
    (branch: Branch | null): Branch | null => {
      if (!branch || !branch.parent) {
        return main;
      }
      return branches.find((candidate) => candidate.id === branch.parent?.id) ?? main;
    },
    [branches, main]
  );

  return {
    isLoading,
    branches,
    others,
    main,
    current,
    currentSlug: slug,
    isOnMain: !current || current.slug === MAIN_SLUG,
    parentOf,
    switchBranch,
  };
};
