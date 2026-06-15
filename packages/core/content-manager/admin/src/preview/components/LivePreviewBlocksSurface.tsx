import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';

import { type UseDocument } from '../../hooks/useDocument';
import { BlocksEditor } from '../../pages/EditView/components/FormInputs/BlocksInput/BlocksEditor';
import { usePreviewContext } from '../pages/Preview';
import { INTERNAL_EVENTS } from '../utils/constants';
import { getSendMessage } from '../utils/getSendMessage';

import { PreviewBlocksToolbar } from './PreviewBlocksToolbar';

import type { Schema } from '@strapi/types';

interface LivePreviewBlocksSurfaceProps {
  documentResponse: ReturnType<UseDocument>;
}

/**
 * Outer wrapper: only renders when a blocks inline edit session is active.
 */
const LivePreviewBlocksSurface = ({ documentResponse }: LivePreviewBlocksSurfaceProps) => {
  const blocksEditSession = usePreviewContext(
    'LivePreviewBlocksSurface',
    (s) => s.blocksEditSession
  );

  if (!blocksEditSession) return null;

  return <LivePreviewBlocksEditor documentResponse={documentResponse} />;
};

/**
 * Inner component: renders the actual editor overlay positioned over the iframe field area.
 */
const LivePreviewBlocksEditor = ({
  documentResponse: _documentResponse,
}: LivePreviewBlocksSurfaceProps) => {
  const iframeRef = usePreviewContext('LivePreviewBlocksEditor', (s) => s.iframeRef);
  const blocksEditSession = usePreviewContext(
    'LivePreviewBlocksEditor',
    (s) => s.blocksEditSession
  )!;
  const setBlocksEditSession = usePreviewContext(
    'LivePreviewBlocksEditor',
    (s) => s.setBlocksEditSession
  );
  const containerRef = React.useRef<HTMLDivElement>(null);

  const field = useField(blocksEditSession.fieldPath);

  const endSession = React.useCallback(() => {
    setBlocksEditSession(null);
  }, [setBlocksEditSession]);

  // Close when the user clicks anywhere in the admin page outside the editor or its portaled UI
  React.useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideEditor = containerRef.current?.contains(target);
      const isInsidePortaledUI = target.closest?.('[data-preview-blocks-ui]');
      if (!isInsideEditor && !isInsidePortaledUI) {
        endSession();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [endSession]);

  // Close on Escape even if the editor isn't focused
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endSession();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [endSession]);

  // Close when the user clicks anywhere in the iframe (notified via postMessage from previewScript)
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (iframeRef.current) {
        try {
          const previewOrigin = new URL(iframeRef.current.src).origin;
          if (e.origin !== previewOrigin) return;
        } catch {}
      }
      if (e.data?.type === INTERNAL_EVENTS.STRAPI_CLICK_OUTSIDE_BLOCKS) {
        endSession();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [endSession, iframeRef]);

  // Send edit start/end messages to the iframe
  React.useEffect(() => {
    const sendMessage = getSendMessage(iframeRef);
    sendMessage(INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_START, {
      fieldPath: blocksEditSession.fieldPath,
    });
    return () => {
      sendMessage(INTERNAL_EVENTS.STRAPI_BLOCKS_EDIT_END, {
        fieldPath: blocksEditSession.fieldPath,
      });
    };
  }, [blocksEditSession.fieldPath, iframeRef]);

  // Compute position (translate iframe-local rect to admin viewport coords)
  const iframeRect = iframeRef.current?.getBoundingClientRect();
  if (!iframeRect) return null;

  const { position } = blocksEditSession;

  const editorTop = iframeRect.top + position.top;
  const editorLeft = iframeRect.left + position.left;
  const editorWidth = position.width;
  // Clip to the visible iframe area so content doesn't bleed into the admin chrome
  const maxHeight = iframeRect.bottom - editorTop;

  // Don't render if the field is scrolled out of view
  if (editorTop >= iframeRect.bottom || editorTop <= iframeRect.top - position.height) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: editorTop,
        left: editorLeft,
        width: editorWidth,
        maxHeight,
        overflow: 'hidden',
        zIndex: 5,
      }}
      onWheel={(e) => {
        const sendMessage = getSendMessage(iframeRef);
        sendMessage(INTERNAL_EVENTS.STRAPI_SCROLL, { deltaX: e.deltaX, deltaY: e.deltaY });
      }}
    >
      <BlocksEditor
        name={blocksEditSession.fieldPath}
        value={field.value as Schema.Attribute.BlocksValue}
        onChange={field.onChange}
        error={field.error}
        ariaLabelId={`preview-blocks-${blocksEditSession.fieldPath}`}
        isLivePreviewInline
        livePreviewSync
        autoFocus
        onEscape={endSession}
        floatingToolbar={<PreviewBlocksToolbar />}
      />
    </div>
  );
};

export { LivePreviewBlocksSurface };
