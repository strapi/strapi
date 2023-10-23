/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route } from 'react-router-dom';

interface LazyCompoProps {
  loadComponent: () => Promise<{ default?: React.ComponentType } | React.ComponentType>;
}

const LazyCompo = ({ loadComponent }: LazyCompoProps) => {
  const [Compo, setCompo] = React.useState<React.ComponentType | null>(null);

  React.useEffect(() => {
    const loadCompo = async () => {
      try {
        const loadedCompo = await loadComponent();

        // TODO the loaded component provided can currently come from a default or named export
        // We will move the entire codebase to use named exports only
        // Until then we support both cases with priority given to the existing default exports
        if (typeof loadedCompo === 'function') {
          setCompo(() => loadedCompo);
        } else if (loadedCompo.default) {
          setCompo(() => loadedCompo.default!);
        }
      } catch (err) {}
    };

    loadCompo();
  }, [loadComponent]);

  if (Compo) {
    return <Compo />;
  }

  return <LoadingIndicatorPage />;
};

export const createRoute = (
  loadComponent: LazyCompoProps['loadComponent'],
  to: string,
  exact: boolean = false
) => {
  return (
    <Route
      render={() => <LazyCompo loadComponent={loadComponent} />}
      key={to}
      path={to}
      exact={exact || false}
    />
  );
};
