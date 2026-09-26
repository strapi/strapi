import { IconButton, Menu } from '@strapi/design-system';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { getTranslationKey } from '../../../../utils/translations';
import { ActionsMenuContent } from '../ActionsMenuContent';
import { CursorAnchoredMenu } from '../CursorAnchoredMenu';
import { FolderActions } from '../FolderActions';

import type { CursorPosition } from '../CursorAnchoredMenu';

/**
 * Hidden until the row is hovered or something inside it has focus, so the tree
 * stays quiet at rest. Wraps the trigger rather than styling it: `Menu.Trigger`
 * types its `tag` against the design system's own component, which a styled
 * wrapper of it no longer satisfies.
 *
 * `:focus-within` keeps it on screen while its own menu is open, since the
 * trigger holds focus for as long as the menu does.
 */
const MenuSlot = styled.div`
  opacity: 0;

  li:hover > div > &,
  &:focus-within,
  &:has([data-state='open']) {
    opacity: 1;
  }

  // Square, matching the chevron at the other end of the row. Descendant rather
  // than child: Menu.Root renders no element today, but that is Radix's
  // business, not something to depend on.
  && button {
    width: 2.4rem;
    height: 2.4rem;
    min-width: 2.4rem;
    min-height: 2.4rem;
    padding: 0.4rem;
  }

  // The row paints its own hover, so the trigger needs a stronger one of its own
  // to read as a separate target sitting on top of it.
  && button:hover,
  && button[data-state='open'] {
    background: ${({ theme }) => theme.colors.primary200};
  }
`;

interface FolderTreeRowMenuProps {
  folder: { id: number; name: string };
  /** Its parent's id, so a move validates against where it actually lives. */
  parentId: number | null;
  /** Set by the row's right-click; null when the menu is closed. */
  menuPosition: CursorPosition | null;
  onCloseMenu: () => void;
}

/**
 * Folder actions on a tree row, from either the `•••` or a right-click.
 *
 * Both render the same `FolderActions`, minus Rename — renaming is a list
 * affordance and the tree does not offer it. Unlike the list, a tree row has no
 * selection, so a right-click always means the row it landed on.
 *
 * One `FolderActions` serves both triggers here rather than two instances, so
 * the dialogs it owns are not duplicated per row.
 */
export const FolderTreeRowMenu = ({
  folder,
  parentId,
  menuPosition,
  onCloseMenu,
}: FolderTreeRowMenuProps) => {
  const { formatMessage } = useIntl();

  return (
    <FolderActions
      folder={folder}
      dragData={{ kind: 'folder', id: folder.id, name: folder.name, parentId }}
      showRename={false}
    >
      {({ items, dialogs }) => (
        <>
          <MenuSlot>
            <Menu.Root modal={false}>
              <Menu.Trigger
                tag={IconButton}
                icon={<More />}
                variant="ghost"
                size="S"
                // The row itself is a button; keep the trigger's click off it.
                onClick={(event: React.MouseEvent) => event.stopPropagation()}
                label={formatMessage(
                  {
                    id: getTranslationKey('sidebar.tree.actions'),
                    defaultMessage: 'Actions for {name}',
                  },
                  { name: folder.name }
                )}
              />
              <ActionsMenuContent popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
                {items}
              </ActionsMenuContent>
            </Menu.Root>
          </MenuSlot>

          {menuPosition !== null && (
            <CursorAnchoredMenu
              position={menuPosition}
              open
              label={formatMessage({
                id: getTranslationKey('list.folder.context-menu.label'),
                defaultMessage: 'Folder actions',
              })}
              onClose={onCloseMenu}
            >
              {items}
            </CursorAnchoredMenu>
          )}

          {dialogs}
        </>
      )}
    </FolderActions>
  );
};
