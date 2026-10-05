import * as React from 'react';

import { Flex, Loader } from '@strapi/design-system';
import { Outlet, useNavigation } from 'react-router-dom';

import { Page } from './PageHelpers';

interface LazyOutletProps {
  /**
   * Compact loader for nested layout content columns (e.g. Settings, Content Manager)
   * where the parent shell should stay visible.
   */
  nested?: boolean;
  /**
   * Parent outlets only use Suspense so nested layouts can own navigation loading UX
   * (side nav stays visible while a child chunk loads).
   */
  suspenseOnly?: boolean;
}

const NestedLoading = () => (
  <Flex alignItems="center" justifyContent="center" minHeight="50vh" padding={8} aria-busy>
    <Loader>Loading content.</Loader>
  </Flex>
);

/**
 * Renders child routes with a visible loading state while lazy chunks load.
 * Suspense fallbacks are suppressed during React Router transitions, so we also
 * check `useNavigation().state` to replace stale outlet content while navigating.
 */
const LazyOutlet = ({ nested = false, suspenseOnly = false }: LazyOutletProps) => {
  const navigation = useNavigation();
  const isNavigating = !suspenseOnly && navigation.state === 'loading';
  const fallback = nested ? <NestedLoading /> : <Page.Loading />;

  if (isNavigating) {
    return fallback;
  }

  return (
    <React.Suspense fallback={fallback}>
      <Outlet />
    </React.Suspense>
  );
};

export { LazyOutlet };
export type { LazyOutletProps };
