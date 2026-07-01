import * as React from 'react';

import { Box } from '@strapi/design-system';
import { createPortal } from 'react-dom';

import { BlocksToolbar } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksToolbar';
import { useFloatingToolbarPosition } from '../hooks/useFloatingToolbarPosition';

/**
 * Renders BlocksToolbar in a portal, positioned over the active text selection.
 * Only visible when there is a non-collapsed selection.
 * Must be rendered inside a Slate provider.
 */
const PreviewBlocksToolbar = (): React.ReactNode | null => {
  const { top, left, visible } = useFloatingToolbarPosition();

  if (!visible) return null;

  return createPortal(
    <Box
      data-preview-blocks-ui
      background="neutral0"
      borderColor="neutral150"
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      shadow="filterShadow"
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 6,
        minWidth: '400px',
        width: 'max-content',
        maxWidth: '600px',
      }}
    >
      <BlocksToolbar />
    </Box>,
    document.body
  );
};

export { PreviewBlocksToolbar };
