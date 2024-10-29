import * as React from 'react';

import { Page } from '@strapi/admin/strapi-admin';

import { usePreviewContext } from '../pages/Preview';

const PreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewIframe', (state) => state.url);

  if (!previewUrl) {
    return <Page.Loading />;
  }

  return (
    <iframe
      src={previewUrl}
      title="Content Preview"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
      }}
    />
  );
};

export { PreviewContent };
