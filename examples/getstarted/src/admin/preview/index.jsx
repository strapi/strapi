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
      'strapi-encode-source-maps': 'true',
    };
    const searchParams = new URLSearchParams({
      locale,
      status,
      populate: '*',
    });
    const route = collectionType === 'collection-types' ? `${apiName}/${documentId}` : apiName;

    // Make both fetch requests in parallel
    const [mainResponse, unrelatedResponse] = await Promise.all([
      fetch(`/api/${route}?${searchParams.toString()}`, { headers }),
      fetch(`/api/homepage?status=draft`, { headers }),
    ]);

    if (!mainResponse.ok) {
      throw new Error(`HTTP error! status: ${mainResponse.status}`);
    }

    if (!unrelatedResponse.ok) {
      throw new Error(`HTTP error! status: ${unrelatedResponse.status}`);
    }

    // Process both responses in parallel
    const [mainResult, unrelatedResult] = await Promise.all([
      mainResponse.json(),
      unrelatedResponse.json(),
    ]);

    return {
      main: mainResult.data,
      unrelated: unrelatedResult.data,
    };
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
