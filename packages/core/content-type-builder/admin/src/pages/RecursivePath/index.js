import React, { lazy, Suspense } from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, Routes, useParams, useMatch } from 'react-router-dom';

const ListView = lazy(() =>
  import(/* webpackChunkName: "content-type-builder-recursive-path" */ '../ListView')
);

const RecursivePath = () => {
  const { url } = useMatch('');
  const { categoryUid } = useParams();

  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Routes>
        <Route path={`${url}/:componentUid`}>
          <ListView categoryId={categoryUid} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default RecursivePath;
