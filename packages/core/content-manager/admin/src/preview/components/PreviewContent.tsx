import * as React from 'react';

import { Box, Flex, IconButton } from '@strapi/design-system';
import { ArrowLeft } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { FormLayout } from '../../pages/EditView/components/FormLayout';
import { usePreviewContext } from '../pages/Preview';

// TODO use ArrowLineLeft once it's available in the DS
const AnimatedArrow = styled(ArrowLeft)<{ isSideEditorOpen: boolean }>`
  will-change: transform;
  rotate: ${(props) => (props.isSideEditorOpen ? '0deg' : '180deg')};
  transition: rotate 0.2s ease-in-out;
`;

const UnstablePreviewContent = () => {
  const previewUrl = usePreviewContext('PreviewContent', (state) => state.url);
  const layout = usePreviewContext('PreviewContent', (state) => state.layout);

  const { formatMessage } = useIntl();

  const [isSideEditorOpen, setIsSideEditorOpen] = React.useState(true);

  return (
    <Flex flex={1} overflow="auto" alignItems="stretch">
      <Box
        overflow="auto"
        width={isSideEditorOpen ? '50%' : 0}
        borderWidth="0 1px 0 0"
        borderColor="neutral150"
        paddingTop={6}
        paddingBottom={6}
        // Remove horizontal padding when the editor is closed or it won't fully disappear
        paddingLeft={isSideEditorOpen ? 6 : 0}
        paddingRight={isSideEditorOpen ? 6 : 0}
        transition="all 0.2s ease-in-out"
      >
        <FormLayout layout={layout.layout} hasBackground />
      </Box>
      <Box position="relative" flex={1} height="100%" overflow="hidden">
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
        <IconButton
          variant="tertiary"
          label={formatMessage(
            isSideEditorOpen
              ? {
                  id: 'content-manager.preview.content.close-editor',
                  defaultMessage: 'Close editor',
                }
              : {
                  id: 'content-manager.preview.content.open-editor',
                  defaultMessage: 'Open editor',
                }
          )}
          onClick={() => setIsSideEditorOpen((prev) => !prev)}
          position="absolute"
          top={2}
          left={2}
        >
          <AnimatedArrow isSideEditorOpen={isSideEditorOpen} />
        </IconButton>
      </Box>
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
