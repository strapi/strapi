import { IconButton, Menu } from '@strapi/design-system';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslationKey } from '../../../utils/translations';

import { ActionsMenuContent } from './ActionsMenuContent';
import { AssetActions } from './AssetActions';

import type { File } from '../../../../../shared/contracts/files';
import type { DragFileData } from '../../../types/dnd';

interface AssetActionsMenuProps {
  asset: File;
  /** Drag data for this asset, so the move dialog validates against its real folder. */
  dragData: DragFileData;
}

/**
 * The "..." menu on an asset row/card. Always acts on that one asset, whatever
 * the current multi-selection is (the bulk actions bar and the right-click menu
 * are the selection-scoped affordances) — the file mirror of `FolderActionsMenu`.
 *
 * The actions themselves live in `AssetActions`, shared with
 * `AssetContextMenu`. This component is only the trigger.
 */
export const AssetActionsMenu = ({ asset, dragData }: AssetActionsMenuProps) => {
  const { formatMessage } = useIntl();

  return (
    <AssetActions asset={asset} dragData={dragData}>
      {({ items, dialogs, hasActions }) =>
        // A role can read the library while holding none of these, and an empty
        // popup is worse than no trigger at all.
        hasActions ? (
          <>
            {/* Non-modal: Radix's default `modal` marks the rest of the document
                `aria-hidden` and blocks pointer events while the menu is open, so
                clicking a sibling row's trigger only dismissed this one — leaving
                every menu you touched to be closed one click at a time. Non-modal
                dismissal treats that click as both "close this" and "open that". */}
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
              {/* `ActionsMenuContent` replaces the design system's flat 15rem clamp
                  with the height Radix actually measured, and un-hides the scrollbar
                  it would otherwise overflow into. See that file for why. */}
              <ActionsMenuContent popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
                {items}
              </ActionsMenuContent>
            </Menu.Root>
            {dialogs}
          </>
        ) : null
      }
    </AssetActions>
  );
};
