import React from 'react';
import { lazy } from 'react';

const Preview = lazy(() =>
  // @ts-ignore
  import('./dummy-preview').then((module) => ({
    default: module.PreviewComponent,
  }))
);

// Pre-fetch the preview data before the route renders
const previewLoader = async ({ params }) => {
  const { apiName, documentId, locale, status, collectionType } = params;
  const apiToken = process.env.STRAPI_ADMIN_API_TOKEN;

  if (!documentId) {
    throw new Error('Document ID is required');
  }

  if (!apiToken) {
    throw new Error('STRAPI_ADMIN_API_TOKEN is not set');
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    };
    const searchParams = new URLSearchParams({
      locale,
      status,
    });
    const route = collectionType === 'collection-types' ? `${apiName}/${documentId}` : apiName;

    const response = await fetch(`/api/${route}?${searchParams.toString()}`, {
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
