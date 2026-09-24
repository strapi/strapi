import type { CSSProperties, ReactNode } from 'react';

import { Menu } from '@strapi/design-system';

import { ActionsMenuContent } from './ActionsMenuContent';

/**
 * The menu is anchored to a zero-sized element parked at the cursor, because
 * the design system's `Menu` is a dropdown: it positions its content against a
 * trigger, and a right-click has none.
 *
 * Inline styles rather than a `styled` wrapper — the trigger renders a design
 * system `Button`, and losing the specificity race with its own class would put
 * a stray button on the page.
 */
const CURSOR_ANCHOR_STYLE: CSSProperties = {
  position: 'fixed',
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  padding: 0,
  border: 0,
  opacity: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
};

export interface CursorPosition {
  x: number;
  y: number;
}

interface CursorAnchoredMenuProps {
  position: CursorPosition;
  /**
   * Controlled, because a caller may need the menu shut while staying mounted —
   * picking an item that opens a dialog is exactly that case.
   */
  open: boolean;
  /** Names the menu for assistive tech — Radix points `aria-labelledby` at the anchor. */
  label: string;
  /**
   * Asked to close. Callers that opened a dialog from an item must defer
   * unmounting until the dialog is done, or the dialog goes with them.
   */
  onClose: () => void;
  children: ReactNode;
}

/**
 * A menu opened at the cursor by a right-click, rather than from a trigger the
 * user can see.
 *
 * Extracted from `MainAreaContextMenu`, which opened the background create menu
 * this way first; the item menus reuse it so the anchoring trick exists once.
 */
export const CursorAnchoredMenu = ({
  position,
  open,
  label,
  onClose,
  children,
}: CursorAnchoredMenuProps) => {
  return (
    <Menu.Root
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <Menu.Trigger
        tabIndex={-1}
        // No visible content, so the name has to come from `aria-label` — the
        // trigger's `label` prop renders as button text, which would defeat the
        // point of an invisible anchor.
        endIcon={null}
        aria-label={label}
        style={{ ...CURSOR_ANCHOR_STYLE, top: position.y, left: position.x }}
      />
      <ActionsMenuContent
        popoverPlacement="bottom-start"
        zIndex={2}
        minWidth="22rem"
        // The anchor is invisible and sits wherever the cursor was, so handing
        // focus back to it on close would be a focus ring nobody can see.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {children}
      </ActionsMenuContent>
    </Menu.Root>
  );
};
