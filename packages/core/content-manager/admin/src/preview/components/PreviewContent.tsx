import * as React from 'react';

import { Box } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { usePreviewContext } from '../pages/Preview';

const PreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewContent', (state) => state.url);

  const { formatMessage } = useIntl();

  return (
    <Box
      src={previewUrl}
      title={formatMessage({
        id: 'content-manager.preview.panel.title',
        defaultMessage: 'Preview',
      })}
      width="100%"
      height="100%"
      style={{
        border: 'none',
      }}
      tag="iframe"
    />
  );
};

export { PreviewContent };
