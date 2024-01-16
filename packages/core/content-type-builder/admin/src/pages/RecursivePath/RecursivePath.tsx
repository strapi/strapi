import { lazy, Suspense } from 'react';

import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Route, Routes } from 'react-router-dom';

const ListView = lazy(() => import('../ListView/ListView'));

export const RecursivePath = () => {
  return (
    <Suspense fallback={<LoadingIndicatorPage />}>
      <Routes>
        <Route path={`/:componentUid`} element={<ListView />} />
      </Routes>
    </Suspense>
  );
};
