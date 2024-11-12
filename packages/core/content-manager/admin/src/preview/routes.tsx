/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import type { PathRouteProps } from 'react-router-dom';

const ProtectedPreviewPage = React.lazy(() =>
  import('./pages/Preview').then((mod) => ({ default: mod.ProtectedPreviewPage }))
);

const routes: PathRouteProps[] = [
  {
    path: ':collectionType/:slug/:id/preview',
    Component: ProtectedPreviewPage,
  },
  {
    path: ':collectionType/:slug/preview',
    Component: ProtectedPreviewPage,
  },
];

export { routes };
