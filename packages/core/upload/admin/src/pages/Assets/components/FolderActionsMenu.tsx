import { IconButton, Menu } from '@strapi/design-system';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { ActionsMenuContent } from './ActionsMenuContent';
import { FolderActions } from './FolderActions';

import type { Folder } from '../../../../../shared/contracts/folders';
import type { DragFolderData } from '../../../types/dnd';

interface FolderActionsMenuProps {
  folder: Folder;
  /** Drag data for this folder, so the move dialog validates against its real parent. */
  dragData: DragFolderData;
}

/**
 * The "..." menu on a folder row/card. Always acts on that one folder, whatever
 * the current multi-selection is (the bulk actions bar and the right-click menu
 * are the selection-scoped affordances).
 *
 * The actions themselves live in `FolderActions`, shared with
 * `FolderContextMenu`. This component is only the trigger.
 */
export const FolderActionsMenu = ({ folder, dragData }: FolderActionsMenuProps) => {
  const { formatMessage } = useIntl();

  return (
    <FolderActions folder={folder} dragData={dragData}>
      {({ items, dialogs }) => (
        <>
          {/* See AssetActionsMenu: non-modal so clicking another row's trigger
              closes this menu and opens that one in a single click. */}
          <Menu.Root modal={false}>
            <Menu.Trigger
              tag={IconButton}
              icon={<More />}
              variant="ghost"
              label={formatMessage({
                id: getTranslationKey('control-card.more-actions'),
                defaultMessage: 'More actions',
              })}
            />
            {/* See ActionsMenuContent: the design system's 15rem default clamps the
                menu against a hidden scrollbar, so items can be silently cut off
                near the viewport edge. This one is shorter, but kept in sync. */}
            <ActionsMenuContent popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
              {items}
            </ActionsMenuContent>
          </Menu.Root>
          {dialogs}
        </>
      )}
    </FolderActions>
  );
};
