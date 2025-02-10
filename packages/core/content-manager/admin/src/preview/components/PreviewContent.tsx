import * as React from 'react';

import { Box, Flex } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { usePreviewContext } from '../pages/Preview';

const UnstablePreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewContent', (state) => state.url);
  const layout = usePreviewContext('PreviewContent', (state) => state.layout);

  const { formatMessage } = useIntl();

  return (
    <Flex flex={1} overflow="auto" alignItems="stretch">
      <Box overflow="auto" flex={1} borderWidth="0 1px 0 0" borderColor="neutral150" padding={6}>
        <FormLayout layout={layout.layout} hasBackground />
      </Box>
      <Box
        src={previewUrl}
        /**
         * For some reason, changing an iframe's src tag causes the browser to add a new item in the
         * history stack. This is an issue for us as it means clicking the back button will not let us
         * go back to the edit view. To fix it, we need to trick the browser into thinking this is a
         * different iframe when the preview URL changes. So we set a key prop to force React
         * to mount a different node when the src changes.
         */
        key={previewUrl}
        title={formatMessage({
          id: 'content-manager.preview.panel.title',
          defaultMessage: 'Preview',
        })}
        flex={1}
        height="100%"
        borderWidth={0}
        tag="iframe"
      />
    </Flex>
  );
};

const PreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewContent', (state) => state.url);

  const { formatMessage } = useIntl();

  return (
    <Box
      src={previewUrl}
      /**
       * For some reason, changing an iframe's src tag causes the browser to add a new item in the
       * history stack. This is an issue for us as it means clicking the back button will not let us
       * go back to the edit view. To fix it, we need to trick the browser into thinking this is a
       * different iframe when the preview URL changes. So we set a key prop to force React
       * to mount a different node when the src changes.
       */
      key={previewUrl}
      title={formatMessage({
        id: 'content-manager.preview.panel.title',
        defaultMessage: 'Preview',
      })}
      width="100%"
      height="100%"
      borderWidth={0}
      tag="iframe"
    />
  );
};

export { PreviewContent, UnstablePreviewContent };
