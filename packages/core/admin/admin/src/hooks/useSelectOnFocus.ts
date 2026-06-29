import { useCallback, useEffect, type FocusEvent } from 'react';

/**
 * Tracks whether the user's most recent interaction was via the keyboard
 * (e.g. Tab) or a pointer (mouse/touch). The focus event itself does not tell
 * us how focus was acquired, so we infer it from the last interaction.
 *
 * The listeners are attached once, in the capture phase, and live for the
 * lifetime of the app — the same lightweight approach the `:focus-visible`
 * polyfill uses. We default to `true` so that programmatic focus selects too.
 */
let lastInteractionWasKeyboard = true;
let listenersInitialized = false;

const initInteractionListeners = () => {
  if (listenersInitialized || typeof window === 'undefined') {
    return;
  }
  listenersInitialized = true;

  window.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Tab') {
        lastInteractionWasKeyboard = true;
      }
    },
    true
  );

  window.addEventListener(
    'pointerdown',
    () => {
      lastInteractionWasKeyboard = false;
    },
    true
  );
};

/**
 * @description Returns an `onFocus` handler that selects a text field's entire
 * content when the field is focused via the keyboard (e.g. Tab), matching the
 * convention used by most operating systems and form-heavy applications.
 *
 * Pointer (click/touch) focus is intentionally left untouched, so clicking
 * into a field still places the caret where the user clicked instead of
 * selecting everything.
 *
 * @example
 * ```tsx
 * const { onFocus } = useSelectOnFocus();
 *
 * return <TextInput onFocus={onFocus} />;
 * ```
 */
const useSelectOnFocus = () => {
  useEffect(() => {
    initInteractionListeners();
  }, []);

  const onFocus = useCallback((event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (lastInteractionWasKeyboard) {
      event.currentTarget.select();
    }
  }, []);

  return { onFocus };
};

export { useSelectOnFocus };
