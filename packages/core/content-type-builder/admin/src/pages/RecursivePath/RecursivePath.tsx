import { lazy, Suspense } from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, Switch, useRouteMatch } from 'react-router-dom';

const ListView = lazy(() => import('../ListView/ListView'));

export const RecursivePath = () => {
  const { url } = useRouteMatch();

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Switch>
        <Route path={`${url}/:componentUid`}>
          <ListView />
        </Route>
      </Switch>
    </Suspense>
  );
};
