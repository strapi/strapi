import { lazy, Suspense } from 'react';

import { Page } from '@strapi/admin/strapi-admin';
import { Route, Routes } from 'react-router-dom';

const ListView = lazy(() => import('../ListView/ListView'));

export const RecursivePath = () => {
  return (
    <Suspense fallback={<Page.Loading />}>
      <Routes>
        <Route path={`/:componentUid`} element={<ListView />} />
      </Routes>
    </Suspense>
  );
};
