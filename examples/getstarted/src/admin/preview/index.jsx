import React from 'react';
import { lazy } from 'react';

const Preview = lazy(() =>
  // @ts-ignore
  import('./dummy-preview').then((module) => ({
    default: module.PreviewComponent,
  }))
);

export const registerPreviewRoute = (app) => {
  app.router.addRoute({
    path: 'preview/*',
    children: [
      {
        path: ':collectionType/:uid/:documentId/:locale/:status',
        element: <Preview />,
      },
    ],
  });
};
