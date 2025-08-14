import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';

import { useHasInputPopoverParent } from '../components/InputPopover';
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
  const hasInputPopoverParent = useHasInputPopoverParent();
  const { value } = useField(name);

  React.useEffect(() => {
    if (!iframe) {
      return;
    }

    const sendMessage = getSendMessage(iframe);
    sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_TYPING, { field: name, value });
  }, [name, value, iframe]);

  const sendMessage = getSendMessage(iframe);

  return {
    onFocus: () => {
      if (hasInputPopoverParent) return;

      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_FOCUS, { field: name });
    },
    onBlur: () => {
      if (hasInputPopoverParent) return;

      setPopoverField?.(null);
      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_BLUR, { field: name });
    },
  };
}
