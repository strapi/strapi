import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';

import { usePreviewContext } from '../pages/Preview';
import { INTERNAL_EVENTS } from '../utils/constants';

type PreviewInputProps = Pick<
  Required<React.InputHTMLAttributes<HTMLInputElement>>,
  'onFocus' | 'onBlur'
> & {
  ref: React.RefObject<HTMLInputElement> | null;
};

export function usePreviewInputManager(name: string): PreviewInputProps {
  const iframe = usePreviewContext('usePreviewInputManager', (state) => state.iframeRef, false);
  const isSideEditorOpen = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.isSideEditorOpen,
    false
  );
  const setPopoverField = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.setPopoverField,
    false
  );
  const { value } = useField(name);

  const isUsingPreview = iframe?.current;

  const sendMessage = React.useCallback(
    (type: string, payload: unknown) => {
      if (!isUsingPreview) return;

      iframe?.current?.contentWindow?.postMessage(
        {
          type,
          payload,
        },
        new URL(iframe.current.src).origin
      );
    },
    [iframe, isUsingPreview]
  );

  React.useEffect(() => {
    if (!isUsingPreview) {
      return;
    }

    sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_TYPING, { field: name, value });
  }, [name, value, isUsingPreview, sendMessage]);

  const fieldRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!isUsingPreview) {
      return;
    }

    const handleMessage = ({ data }: MessageEvent) => {
      if (data?.type === INTERNAL_EVENTS.WILL_EDIT_FIELD && data.payload?.path === name) {
        // If the side editor is open, focus the matching field inside it
        if (isSideEditorOpen) {
          fieldRef.current?.focus();
          fieldRef.current?.scrollIntoView({
            block: 'center',
            behavior: 'smooth',
          });
        } else {
          // No side editor so we display the field in a popover
          setPopoverField?.(data.payload);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [name, fieldRef, isSideEditorOpen, setPopoverField, isUsingPreview]);

  if (!isUsingPreview) {
    // Return no-ops for convenience so we can always safely destructure these methods
    return { onBlur: () => {}, onFocus: () => {}, ref: null };
  }

  return {
    onFocus: () => {
      // If side editor is open, input renderers are inside popovers in the right location,
      // so no need for focus highlights as it's clear where the field is used.
      if (!isSideEditorOpen) return;

      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_FOCUS, { field: name });
    },
    onBlur: () => {
      // If side editor is open, input renderers are inside popovers in the right location,
      // so no need for focus highlights as it's clear where the field is used.
      if (!isSideEditorOpen) return;

      setPopoverField?.(null);
      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_BLUR, { field: name });
    },
    ref: fieldRef,
  };
}
