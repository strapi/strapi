import { MutableRefObject, useEffect, useState } from 'react';

import { useQuery } from './useQuery';

type InputFieldRefs = HTMLElement | { input: MutableRefObject<HTMLInputElement> } | null;

/**
 * @description Given the name of an input field (this does not need to be the name you pass as a prop to the DOM element),
 * when the query param `field` matches the name the field will be focused & scrolled into the center of the view.
 * Uses a callback ref to set the field to ensure asynchronous rendering of inputs does not cause issues e.g. CodeMirror.EditView
 *
 * @example
 * ```tsx
 * const fieldRef = useFocusInputField('name');
 *
 * return (
 *  <input ref={fieldRef} />
 * );
 * ```
 */
export const useFocusInputField = (name: string): ((node: InputFieldRefs) => void) => {
  const search = useQuery();

  /**
   * TODO: remove union and just use `HTMLElement`
   *
   * Realistically, it will only be an `HTMLElement` but `TextInput` in the design-system
   * has an imperativeHandle we can't remove until v2 of the design-system.
   */
  const [field, setField] = useState<InputFieldRefs>(null);

  useEffect(() => {
    if (search.has('field') && search.get('field') === name && field) {
      /**
       * TODO: simplify this when we use v2 of the design-system
       */
      if ('input' in field) {
        field.input.current.focus();
        field.input.current.scrollIntoView({
          block: 'center',
        });
      } else {
        field.focus();
        field.scrollIntoView({
          block: 'center',
        });
      }
    }
  }, [search, name, field]);

  return setField;
};
