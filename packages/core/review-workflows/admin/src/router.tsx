/* eslint-disable check-file/filename-naming-convention */
import { lazy } from 'react';

import { Routes, Route, PathRouteProps } from 'react-router-dom';

const ProtectedListPage = lazy(() =>
  import('./routes/settings').then((mod) => ({ default: mod.ProtectedListPage }))
);
const ProtectedEditPage = lazy(() =>
  import('./routes/settings/:id').then((mod) => ({ default: mod.ProtectedEditPage }))
);

const routes: PathRouteProps[] = [
  {
    path: '/',
    Component: ProtectedListPage,
  },
  {
    path: ':id',
    Component: ProtectedEditPage,
  },
];

const Router = () => (
  <Routes>
    {routes.map((route) => (
      <Route key={route.path} {...route} />
    ))}
  </Routes>
);

export { Router };
