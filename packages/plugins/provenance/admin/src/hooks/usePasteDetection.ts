import * as React from 'react';

import { useForm } from '@strapi/admin/strapi-admin';

import { findPastedFields, PASTE_MIN_LENGTH } from '../utils/paste';

// Editors apply a paste asynchronously; Blocks and Markdown can take a few frames
const CHECK_DELAYS_MS = [100, 600];

/**
 * Calls `onPaste` with the tracked fields a paste landed in, by comparing the edit view form
 * values right before and right after it. Works for every input type, Blocks and Markdown
 * editors included, without relying on the DOM of each input.
 */
export const usePasteDetection = (
  fields: string[],
  onPaste: (fields: string[], pasted: string) => void
) => {
  const getValues = useForm('ProvenancePasteDetection', (state) => state.getValues);
  const onPasteRef = React.useRef(onPaste);
  onPasteRef.current = onPaste;

  React.useEffect(() => {
    if (fields.length === 0) {
      return undefined;
    }

    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const handlePaste = (event: ClipboardEvent) => {
      const pasted = event.clipboardData?.getData('text/plain') ?? '';

      if (pasted.trim().length < PASTE_MIN_LENGTH) {
        return;
      }

      // Capture phase: the editor has not applied the paste yet
      const before = getValues() as Record<string, unknown>;
      let reported = false;

      CHECK_DELAYS_MS.forEach((delay) => {
        timers.push(
          setTimeout(() => {
            if (reported) {
              return;
            }

            const pastedFields = findPastedFields({
              fields,
              before,
              after: getValues() as Record<string, unknown>,
              pasted,
            });

            if (pastedFields.length > 0) {
              reported = true;
              onPasteRef.current(pastedFields, pasted);
            }
          }, delay)
        );
      });
    };

    document.addEventListener('paste', handlePaste, true);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
      timers.forEach(clearTimeout);
    };
  }, [fields, getValues]);
};
