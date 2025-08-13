import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';

import { usePreviewContext } from '../pages/Preview';
import { INTERNAL_EVENTS } from '../utils/constants';
import { getSendMessage } from '../utils/getSendMessage';

type PreviewInputProps = Pick<
  Required<React.InputHTMLAttributes<HTMLInputElement>>,
  'onFocus' | 'onBlur'
>;

export function usePreviewInputManager(name: string): PreviewInputProps {
  const iframe = usePreviewContext('usePreviewInputManager', (state) => state.iframeRef, false);
  const setPopoverField = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.setPopoverField,
    false
  );
  const isSideEditorOpen = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.isSideEditorOpen,
    false
  );
  const { value } = useField(name);

  const isUsingPreview = Boolean(iframe?.current);

  React.useEffect(() => {
    if (!isUsingPreview || !iframe) {
      return;
    }

    const sendMessage = getSendMessage(iframe);
    sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_TYPING, { field: name, value });
  }, [name, value, isUsingPreview, iframe]);

  React.useEffect(() => {
    if (!isUsingPreview) {
      return;
    }

    const handleMessage = ({ data }: MessageEvent) => {
      if (data?.type === INTERNAL_EVENTS.WILL_EDIT_FIELD && data.payload?.path === name) {
        setPopoverField?.(data.payload);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [name, setPopoverField, isUsingPreview]);

  const sendMessage = getSendMessage(iframe);

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
  };
}
