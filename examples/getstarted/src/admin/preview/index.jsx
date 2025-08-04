import React from 'react';
import { lazy } from 'react';

const Preview = lazy(() =>
  // @ts-ignore
  import('./dummy-preview').then((module) => ({
    default: module.PreviewComponent,
  }))
);

// Loader function for fetching preview data
const previewLoader = async ({ params }) => {
  const { apiName, documentId, locale, status } = params;

  if (!documentId) {
    throw new Error('Document ID is required');
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (process.env.STRAPI_ADMIN_API_TOKEN) {
      headers.Authorization = `Bearer ${process.env.STRAPI_ADMIN_API_TOKEN}`;
    }

    const searchParams = new URLSearchParams({
      locale,
      status,
      encodeSourceMaps: 'true',
    });

    const response = await fetch(`/api/${apiName}/${documentId}?${searchParams.toString()}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Error fetching preview data:', error);
    throw error;
  }
};

export const registerPreviewRoute = (app) => {
  app.router.addRoute({
    path: 'preview/*',
    children: [
      {
        path: ':collectionType/:apiName/:documentId/:locale/:status',
        element: <Preview />,
        loader: previewLoader,
      },
    ],
  });
};
