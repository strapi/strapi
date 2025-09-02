import * as React from 'react';

import { useField } from '@strapi/admin/strapi-admin';

import { useHasInputPopoverParent } from '../components/InputPopover';
import { usePreviewContext } from '../pages/Preview';
import { INTERNAL_EVENTS } from '../utils/constants';
import { parsePathWithIndices, getAttributeSchema } from '../utils/fieldUtils';
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
  const schema = usePreviewContext('usePreviewInputManager', (state) => state.schema, false);
  const components = usePreviewContext(
    'usePreviewInputManager',
    (state) => state.components,
    false
  );
  const hasInputPopoverParent = useHasInputPopoverParent();
  const { value } = useField(name);

  // Parse the field path and resolve the attribute to check if it's a component structure
  const pathParts = parsePathWithIndices(name);

  const attributeSchema =
    schema && components ? getAttributeSchema({ pathParts, schema, components }) : null;
  const type = attributeSchema?.type;

  React.useEffect(() => {
    if (!iframe || !type) {
      return;
    }

    /**
     * Only send message if the field is not a data structure (component, dynamic zone)
     * because we already send events for their fields
     */
    // TODO: add relations
    if (!['component', 'dynamiczone'].includes(type)) {
      const sendMessage = getSendMessage(iframe);
      sendMessage(INTERNAL_EVENTS.STRAPI_FIELD_CHANGE, { field: name, value });
    }
  }, [name, value, iframe, type]);

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
