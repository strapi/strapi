import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';
import { useSearchParams } from 'react-router-dom';

import { usePreviewContext } from '../pages/Preview';

import { EVENTS } from './constants';

function usePreviewInputManager(
  name: string
): Pick<Required<React.InputHTMLAttributes<HTMLInputElement>>, 'onFocus' | 'onBlur'> {
  const [, setSearchParams] = useSearchParams();
  const iframe = usePreviewContext('usePreviewInputManager', (state) => state.iframeRef, false);
  const isSideEditorOpen = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.isSideEditorOpen,
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

    sendMessage(EVENTS.STRAPI_FIELD_TYPING, { field: name, value });
  }, [name, value, isUsingPreview, sendMessage]);

  if (!isUsingPreview) {
    // Return no-ops for convenience so we can always safely destructure these methods
    return { onBlur: () => {}, onFocus: () => {} };
  }

  return {
    onFocus: () => {
      // If side editor is open, input renderers are inside popovers in the right location,
      // so no need for focus highlights as it's clear where the field is used.
      if (!isSideEditorOpen) return;

      sendMessage(EVENTS.STRAPI_FIELD_FOCUS, { field: name });
    },
    onBlur: () => {
      // If side editor is open, input renderers are inside popovers in the right location,
      // so no need for focus highlights as it's clear where the field is used.
      if (!isSideEditorOpen) return;

      // Clear the field query parameter when blurring so it can be autofocused again if needed
      setSearchParams(
        (prev) => {
          prev.delete('field');
          return prev;
        },
        { replace: true }
      );
      sendMessage(EVENTS.STRAPI_FIELD_BLUR, { field: name });
    },
  };
}

export { usePreviewInputManager };
