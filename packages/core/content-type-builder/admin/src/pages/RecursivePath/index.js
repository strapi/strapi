import React, { lazy, Suspense } from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, Switch, useParams, useRouteMatch } from 'react-router-dom';

const ListView = lazy(() =>
  import(/* webpackChunkName: "content-type-builder-recursive-path" */ '../ListView')
);

const RecursivePath = () => {
  const { url } = useRouteMatch();
  const { categoryUid } = useParams();

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Switch>
        <Route path={`${url}/:componentUid`}>
          <ListView categoryId={categoryUid} />
        </Route>
      </Switch>
    </Suspense>
  );
};

export default RecursivePath;
