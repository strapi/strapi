import * as React from 'react';

import { useIsMobile } from '@strapi/admin/strapi-admin';
import { Box } from '@strapi/design-system';
import { createPortal } from 'react-dom';

import { BlocksToolbar } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksToolbar';
import { useFloatingToolbarPosition } from '../hooks/useFloatingToolbarPosition';
import { usePreviewContext } from '../pages/Preview';

/**
 * Renders BlocksToolbar in a portal, positioned over the active text selection.
 * Only visible when there is a non-collapsed selection.
 * Must be rendered inside a Slate provider.
 */
const PreviewBlocksToolbar = (): React.ReactNode | null => {
  const iframeRef = usePreviewContext('PreviewBlocksToolbar', (s) => s.iframeRef);
  const isMobile = useIsMobile();
  const { top, left, visible } = useFloatingToolbarPosition(iframeRef);

  if (!visible) return null;

  const positionStyle = isMobile
    ? {
        left: '50%' as const,
        transform: 'translateX(-50%)',
        width: 'max-content',
        maxWidth: 'calc(100vw - 16px)',
      }
    : {
        left,
        minWidth: '400px',
        width: 'max-content',
        maxWidth: '600px',
      };

  return createPortal(
    <Box
      data-preview-blocks-ui
      background="neutral0"
      borderColor="neutral150"
      borderStyle="solid"
      borderWidth="1px"
      hasRadius
      shadow="filterShadow"
      style={{ position: 'fixed', top, zIndex: 6, ...positionStyle }}
    >
      <BlocksToolbar />
    </Box>,
    document.body
  );
};

export { PreviewBlocksToolbar };
