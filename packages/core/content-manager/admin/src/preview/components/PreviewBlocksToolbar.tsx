import * as React from 'react';

import { createPortal } from 'react-dom';

import { BlocksToolbar } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksToolbar';
import { useFloatingToolbarPosition } from '../hooks/useFloatingToolbarPosition';

/**
 * Renders BlocksToolbar in a portal, positioned over the active text selection.
 * Only visible when there is a non-collapsed selection.
 * Must be rendered inside a Slate provider.
 */
const PreviewBlocksToolbar = () => {
  const { top, left, visible } = useFloatingToolbarPosition();

  if (!visible) return null;

  return createPortal(
    <div
      data-preview-blocks-ui
      style={{
        position: 'fixed',
        top,
        left,
        zIndex: 6,
        background: 'var(--strapi-neutral-0, #fff)',
        border: '1px solid var(--strapi-neutral-150, #eaeaef)',
        borderRadius: '4px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '400px',
        width: 'max-content',
        maxWidth: '600px',
      }}
    >
      <BlocksToolbar />
    </div>,
    document.body
  );
};

export { PreviewBlocksToolbar };
