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
  const previewOriginRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    try {
      previewOriginRef.current = iframeRef.current ? new URL(iframeRef.current.src).origin : null;
    } catch {
      previewOriginRef.current = null;
    }
  }, [iframeRef]);

  const field = useField(blocksEditSession.fieldPath);

  // Track latest value via ref so the cleanup closure can read it without going stale
  const latestValueRef = React.useRef(field.value);
  React.useEffect(() => {
    latestValueRef.current = field.value;
  }, [field.value]);

  const sendMessage = React.useMemo(() => getSendMessage(iframeRef), [iframeRef]);

  const endSession = React.useCallback(() => {
    setBlocksEditSession(null);
  }, [setBlocksEditSession]);

  // Close when the user clicks anywhere in the admin page outside the editor or its portaled UI
  React.useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInsideEditor = containerRef.current?.contains(target);
      const isInsidePortaledUI =
        // Floating toolbar wrapper and any element that opts in
        target.closest?.('[data-preview-blocks-ui]') ||
        // Radix Select dropdown portal (block type selector options, etc.)
        // These are portaled to document.body outside data-preview-blocks-ui,
        // but the mousedown fires before Radix can register the selection.
        target.closest?.('[role="listbox"]') ||
        // Radix Dialog portals (e.g. image block modal, link modal)
        target.closest?.('[role="dialog"]');
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

  // Track the field's position as the iframe scrolls
  const [position, setPosition] = React.useState(blocksEditSession.position);

  // Cache the iframe's bounding rect so getBoundingClientRect is not called on every render.
  // The rect only changes when the admin layout shifts (window resize), not on keystrokes.
  const [iframeRect, setIframeRect] = React.useState<DOMRect | undefined>(
    () => iframeRef.current?.getBoundingClientRect()
  );

  React.useEffect(() => {
    const updateRect = () => setIframeRect(iframeRef.current?.getBoundingClientRect());
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, [iframeRef]);

  // Close when the user clicks anywhere in the iframe (notified via postMessage from previewScript)
  // Also update position when the iframe scrolls
  React.useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (previewOriginRef.current && e.origin !== previewOriginRef.current) return;
      if (e.data?.type === INTERNAL_EVENTS.STRAPI_CLICK_OUTSIDE_BLOCKS) {
        endSession();
      }
      if (e.data?.type === INTERNAL_EVENTS.STRAPI_FIELD_POSITION_SYNC) {
        setPosition(e.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [endSession, iframeRef]);

  // Send the updated content to the iframe so its hidden BlocksRenderer reflows to the
  // correct height as the user edits. Batched to one message per animation frame so rapid
  // keystrokes don't trigger a separate iframe re-render each — latestValueRef ensures the
  // callback always sends the most recent value even if several renders were batched.
  React.useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, {
        field: blocksEditSession.fieldPath,
        value: latestValueRef.current,
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [field.value, blocksEditSession.fieldPath, sendMessage]);

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
      // Forward the final value after END so the host app can re-render
      // the blocks content without requiring a save.
      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, {
        field: blocksEditSession.fieldPath,
        value: latestValueRef.current,
      });
    };
  }, [blocksEditSession.fieldPath, iframeRef]);

  const rawTop = iframeRect ? iframeRect.top + position.top : 0;
  const rawBottom = rawTop + position.height;

  // Close automatically when the field has scrolled entirely out of the iframe viewport
  const isOutOfView = !iframeRect || rawBottom <= iframeRect.top || rawTop >= iframeRect.bottom;

  // Must be before any conditional return to satisfy rules-of-hooks
  React.useEffect(() => {
    if (isOutOfView) endSession();
  }, [isOutOfView, endSession]);

  if (!iframeRect || isOutOfView) return null;

  return (
    // Clipping wrapper covers exactly the visible iframe area; the editor moves freely inside it
    <div
      style={{
        position: 'fixed',
        top: iframeRect.top,
        left: iframeRect.left,
        width: iframeRect.width,
        height: iframeRect.height,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: position.top,
          left: position.left,
          width: position.width,
          pointerEvents: 'auto',
        }}
        onWheel={(e) => {
          // React portals (toolbar, dropdowns, dialogs) bubble synthetic events through the
          // React tree even when their DOM nodes live in document.body. Guard against forwarding
          // a scroll that originated inside portaled UI rather than the editor content itself.
          const target = e.target as HTMLElement;
          if (
            target.closest('[data-preview-blocks-ui]') ||
            target.closest('[role="listbox"]') ||
            target.closest('[role="dialog"]')
          ) {
            return;
          }
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
    </div>
  );
};

export { LivePreviewBlocksSurface };
