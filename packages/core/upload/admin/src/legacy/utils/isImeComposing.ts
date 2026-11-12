import type { KeyboardEvent } from 'react';

// keyCode 229 identifies a key event processed by an IME.
// The confirming keydown can follow compositionend, leaving isComposing false.
// Check both to avoid submitting when the user only confirms IME input.
// https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event#keydown_events_with_ime
const IME_PROCESSING_KEY_CODE = 229;

export const isImeComposing = (event: KeyboardEvent) =>
  event.nativeEvent.isComposing || event.nativeEvent.keyCode === IME_PROCESSING_KEY_CODE;
