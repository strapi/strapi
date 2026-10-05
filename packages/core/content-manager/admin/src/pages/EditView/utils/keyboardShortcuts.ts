/* -------------------------------------------------------------------------------------------------
 * Edit view keyboard shortcuts
 * -----------------------------------------------------------------------------------------------*/

/**
 * The document actions that can be triggered with a keyboard shortcut from the edit view.
 */
export type EditViewShortcut = 'save' | 'publish';

/**
 * Resolves the document action intended by a keyboard event in the edit view.
 *
 * The platform modifier (`Cmd` on macOS, `Ctrl` on Windows/Linux) is always required so the
 * shortcuts never collide with a plain `Enter` (new line in a textarea, native form submit in a
 * single-line input).
 *
 * - `Cmd/Ctrl + Enter`         → save (draft)
 * - `Cmd/Ctrl + S`             → save (draft) — common editor alias
 * - `Cmd/Ctrl + Shift + Enter` → publish
 *
 * Returns `null` when the event does not match any shortcut.
 */
export const getEditViewShortcut = (event: KeyboardEvent): EditViewShortcut | null => {
  const hasPlatformModifier = event.metaKey || event.ctrlKey;

  if (!hasPlatformModifier) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === 'enter') {
    return event.shiftKey ? 'publish' : 'save';
  }

  if (key === 's' && !event.shiftKey) {
    return 'save';
  }

  return null;
};
