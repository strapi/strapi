import * as React from 'react';

import { usePreviewContext } from '../pages/Preview';

const PreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewContent', (state) => state.url);

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
