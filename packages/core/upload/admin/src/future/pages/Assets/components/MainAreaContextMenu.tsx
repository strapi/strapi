import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

import { Menu } from '@strapi/design-system';
import { Files, Folder as FolderIcon, Link } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { isEventFromWithin } from '../../../utils/isEventFromWithin';
import { getTranslationKey } from '../../../utils/translations';

import { ActionsMenuContent } from './ActionsMenuContent';

/**
 * Subtrees that keep the browser's own context menu instead of opening the
 * create menu.
 *
 * `data-native-context-menu` is the explicit opt-out carried by the list items
 * themselves (asset cards, folder cards, table rows) and by the bulk actions
 * bar — right-clicking one of those must behave exactly as it does today. The
 * rest are the generic cases where the native menu is the useful one: links,
 * buttons and anything the user can type into or select text in.
 *
 * `thead` covers the table's header row, which is chrome rather than empty
 * background even though it carries no `data-native-context-menu` item.
 */
const NATIVE_CONTEXT_MENU_SELECTOR = [
  '[data-native-context-menu]',
  'thead',
  'a',
  'button',
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
].join(', ');

/**
 * Fills the main column so the empty space below the last row still belongs to
 * the menu's hit area — right-clicking under a short list is the whole point of
 * the gesture. `flex: 1` only bites once an ancestor has a height to give; when
 * it doesn't, this collapses to its content and the area is just the list, as
 * it was before.
 */
const ContextMenuArea = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
`;

/**
 * The menu is anchored to a zero-sized element parked at the cursor, because
 * the design system's `Menu` is a dropdown: it positions its content against a
 * trigger, and there is no real trigger for a right-click on empty space.
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

interface CursorPosition {
  x: number;
  y: number;
}

interface MainAreaContextMenuProps {
  children: ReactNode;
  /** Opens the "new folder" dialog in the folder currently on screen. */
  onCreateFolder: () => void;
  /** Opens the native file picker — same entry point as the header "New" menu. */
  onImportFiles: () => void;
  /** Opens the "import from URL" dialog. */
  onImportFromUrl: () => void;
  /**
   * RBAC gate — without `assets.create` there is nothing to offer, so the
   * right-click falls through to the browser. Required (not defaulted) so a
   * permission gate can't silently regress to permissive.
   */
  disabled: boolean;
}

/**
 * Drive/Dropbox-style right-click on the empty parts of the assets area: the
 * same creation actions the header "New" menu offers, acting on the folder
 * currently open.
 *
 * Deliberately background-only. Right-clicking an asset, a folder or a table
 * row is left alone — those carry `data-native-context-menu` and keep the
 * browser's menu (which is what you want over a thumbnail or a filename).
 * Item-level context menus would be a separate feature; the "..." menus are
 * the row-scoped affordance today.
 */
export const MainAreaContextMenu = ({
  children,
  onCreateFolder,
  onImportFiles,
  onImportFromUrl,
  disabled,
}: MainAreaContextMenuProps) => {
  const { formatMessage } = useIntl();
  const [position, setPosition] = useState<CursorPosition | null>(null);

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled) {
      return;
    }

    // Portaled content (this menu, the dialogs a row's "..." menu opens) bubbles
    // through the React tree without ever being a DOM descendant. Same guard the
    // cards and rows use for their own handlers.
    if (!isEventFromWithin(event)) {
      return;
    }

    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest(NATIVE_CONTEXT_MENU_SELECTOR)) {
      return;
    }

    event.preventDefault();
    // A right-click while the menu is open reaches Radix's dismiss listener
    // first, which closes it; re-anchoring here reopens it under the new cursor
    // rather than leaving the user with a menu that just vanished.
    setPosition({ x: event.clientX, y: event.clientY });
  };

  return (
    <ContextMenuArea onContextMenu={handleContextMenu} data-testid="assets-context-menu-area">
      {children}
      {/* Non-modal, like the row-level menus: a right-click elsewhere is both
          "close this" and "open that", which a modal layer would swallow.
          Skipped entirely without the permission — the anchor is a real
          (if invisible) button, and one that can never open is noise in the
          accessibility tree. */}
      {!disabled && (
        <Menu.Root
          modal={false}
          open={position !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPosition(null);
            }
          }}
        >
          <Menu.Trigger
            tabIndex={-1}
            // No visible content, so the name has to come from `aria-label` —
            // the trigger's `label` prop renders as button text, which would
            // defeat the point of an invisible anchor. Radix points the menu's
            // `aria-labelledby` at this element, so it names the menu too.
            endIcon={null}
            aria-label={formatMessage({
              id: getTranslationKey('list.context-menu.label'),
              defaultMessage: 'Media library actions',
            })}
            style={{ ...CURSOR_ANCHOR_STYLE, top: position?.y ?? 0, left: position?.x ?? 0 }}
          />
          <ActionsMenuContent
            popoverPlacement="bottom-start"
            zIndex={2}
            minWidth="22rem"
            // The anchor is invisible and sits wherever the cursor was, so
            // handing focus back to it on close would be a focus ring nobody can
            // see. Let it fall to the body instead.
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <Menu.Item onSelect={onCreateFolder} startIcon={<FolderIcon />}>
              {formatMessage({
                id: getTranslationKey('folder.create.title'),
                defaultMessage: 'New folder',
              })}
            </Menu.Item>
            <Menu.Item onSelect={onImportFiles} startIcon={<Files />}>
              {formatMessage({
                id: getTranslationKey('import-files'),
                defaultMessage: 'File upload',
              })}
            </Menu.Item>
            <Menu.Item onSelect={onImportFromUrl} startIcon={<Link />}>
              {formatMessage({
                id: getTranslationKey('import-from-url'),
                defaultMessage: 'File upload from URL',
              })}
            </Menu.Item>
          </ActionsMenuContent>
        </Menu.Root>
      )}
    </ContextMenuArea>
  );
};
