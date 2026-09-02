import { useMemo, useRef, useState } from 'react';

import { useClipboard, useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  Flex,
  IconButton,
  Menu,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { ArrowRight, ArrowsCounterClockwise, Download, Link, More, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useAIMetadataEnabled } from '../../../hooks/useAIMetadataEnabled';
import { useApiErrorMessage } from '../../../hooks/useApiErrorMessage';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useReplaceAssetMutation } from '../../../services/assets';
import { downloadFile } from '../../../utils/downloadFile';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useBusyAssetsOptional } from '../hooks/useBusyAssets';
import { assetKey } from '../utils/selection';

import { ActionsMenuContent } from './ActionsMenuContent';
import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';

import type { File } from '../../../../../../shared/contracts/files';
import type { DragFileData } from '../../../types/dnd';

interface AssetActionsMenuProps {
  asset: File;
  /** Drag data for this asset, so the move dialog validates against its real folder. */
  dragData: DragFileData;
}

/**
 * The "..." menu on an asset row/card. Always acts on that one asset, whatever
 * the current multi-selection is (the bulk actions bar is the selection-scoped
 * affordance) — the file mirror of `FolderActionsMenu`.
 *
 * Replace / copy link / download duplicate what the details drawer offers as
 * icon buttons, so the same action is one click away without opening the asset
 * first. They are re-implemented rather than lifted out of the drawer: the
 * drawer versions render as `IconButton`s and report through its in-drawer toast
 * slot, neither of which fits a menu item on a row.
 *
 * A successful move or delete deselects this one asset and leaves the rest of
 * the selection intact: the mutations only invalidate RTK tags, so without it an
 * `asset:<id>` key for a file that has been deleted — or has moved out of this
 * list — would linger. The other selected rows are untouched, which is the whole
 * point of the menu being a single-item affordance.
 */
export const AssetActionsMenu = ({ asset, dragData }: AssetActionsMenuProps) => {
  const { formatMessage } = useIntl();
  const getErrorMessage = useApiErrorMessage();
  const { copy } = useClipboard();
  const { toggleNotification } = useNotification();
  const { deselect } = useAssetSelection();
  // Absent in the asset picker and in unit tests: the replace still runs, it
  // just renders no row-level overlay.
  const markBusy = useBusyAssetsOptional()?.markBusy ?? (() => () => {});
  const {
    canUpdate,
    canDownload,
    canCopyLink,
    isLoading: isLoadingPermissions,
  } = useMediaLibraryPermissions();
  const [replaceAsset, { isLoading: isReplacing }] = useReplaceAssetMutation();
  const aiEnabled = useAIMetadataEnabled({ mime: asset.mime });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Stable identity: the move dialog memoizes its destination walk on it.
  const moveItems = useMemo(() => [dragData], [dragData]);

  // Confirm first, then open the native picker, so the user only commits to
  // replacing after acknowledging the warning (same order as the drawer).
  const handleReplaceContinue = () => {
    setIsReplaceOpen(false);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the native input so the same file can be picked again later.
    event.target.value = '';

    if (!file) {
      return;
    }

    // The menu has closed by the time the picker returns, so `isReplacing` has
    // nothing left to disable and the row would otherwise sit inert for the
    // whole upload. Marking the asset busy puts the same overlay the drawer
    // uses on the row/card, cleared when the mutation settles either way.
    const releaseBusy = markBusy(
      asset.id,
      formatMessage({
        id: getTranslationKey('asset-details.replace.loading'),
        defaultMessage: 'Replacing the file…',
      })
    );

    let res;
    try {
      res = await replaceAsset({ id: asset.id, file, fileInfo: { name: asset.name } });
    } finally {
      releaseBusy();
    }

    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: getErrorMessage(
          res.error,
          formatMessage({
            id: getTranslationKey('asset-details.replace.error'),
            defaultMessage: 'Failed to replace the file.',
          })
        ),
      });
      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({
        id: getTranslationKey('asset-details.replace.success'),
        defaultMessage: 'File replaced.',
      }),
    });
  };

  const handleCopyLink = async () => {
    const url = prefixFileUrlWithBackendUrl(asset.url);

    if (!url) {
      return;
    }

    const didCopy = await copy(url);

    toggleNotification({
      type: didCopy ? 'success' : 'danger',
      message: formatMessage(
        didCopy
          ? {
              id: getTranslationKey('asset-details.copy-link.success'),
              defaultMessage: 'Link copied.',
            }
          : {
              id: getTranslationKey('asset-details.copy-link.error'),
              defaultMessage: 'Failed to copy the link.',
            }
      ),
    });
  };

  const handleDownload = async () => {
    const url = prefixFileUrlWithBackendUrl(asset.url);

    if (!url) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadFile(url, asset.name);
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('asset-details.download.error'),
          defaultMessage: 'Failed to download the file.',
        }),
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Two permission-gated groups: replace/copy-link/download above, move/delete
  // below. The separator earns its place only when both survive the gate —
  // `canUpdate` alone puts Replace in the top group, which is not enough.
  const hasTopGroup = canUpdate || canCopyLink || canDownload;
  const hasBottomGroup = canUpdate;
  const showSeparator = (canCopyLink || canDownload) && hasBottomGroup;

  // A role can read the library while holding none of these, and an empty
  // popup is worse than no trigger at all. Every flag is `false` until the
  // RBAC check settles, so wait for it — otherwise the trigger unmounts and
  // remounts on first paint for everyone.
  if (!isLoadingPermissions && !hasTopGroup && !hasBottomGroup) {
    return null;
  }

  return (
    <>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          // Replacing swaps the bytes of an existing asset, so the picker offers
          // only its own type. Without this the picker accepted anything and a
          // JPG could come back as PNG bytes still served under a `.jpg` url,
          // since replace preserves hash and ext by design.
          accept={asset.mime ?? ''}
          multiple={false}
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
        />
      </VisuallyHidden>
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
          {canUpdate && (
            <Menu.Item
              startIcon={<ArrowsCounterClockwise />}
              disabled={isReplacing}
              onSelect={() => setIsReplaceOpen(true)}
            >
              {formatMessage({
                id: getTranslationKey('list.assets.actions.replace'),
                defaultMessage: 'Replace media',
              })}
            </Menu.Item>
          )}
          {canCopyLink && (
            <Menu.Item startIcon={<Link />} onSelect={handleCopyLink}>
              {formatMessage({
                id: getTranslationKey('list.assets.actions.copy-link'),
                defaultMessage: 'Copy link to media',
              })}
            </Menu.Item>
          )}
          {canDownload && (
            <Menu.Item startIcon={<Download />} disabled={isDownloading} onSelect={handleDownload}>
              {formatMessage({
                id: getTranslationKey('list.assets.actions.download'),
                defaultMessage: 'Download media',
              })}
            </Menu.Item>
          )}
          {showSeparator && <Menu.Separator />}
          {canUpdate && (
            <>
              <Menu.Item startIcon={<ArrowRight />} onSelect={() => setIsMoveOpen(true)}>
                {formatMessage({
                  id: getTranslationKey('list.assets.actions.move'),
                  defaultMessage: 'Move to folder',
                })}
              </Menu.Item>
              <Menu.Item
                startIcon={<Trash />}
                variant="danger"
                onSelect={() => setIsDeleteOpen(true)}
              >
                {formatMessage({
                  id: getTranslationKey('list.assets.actions.delete'),
                  defaultMessage: 'Delete',
                })}
              </Menu.Item>
            </>
          )}
        </ActionsMenuContent>
      </Menu.Root>
      <Dialog.Root open={isReplaceOpen} onOpenChange={setIsReplaceOpen}>
        <Dialog.Content>
          <Dialog.Header>
            {formatMessage({
              id: getTranslationKey('asset-details.replace.title'),
              defaultMessage: 'Replace this media file?',
            })}
          </Dialog.Header>
          <Dialog.Body textAlign="center">
            <Flex direction="column" textAlign="center">
              <Typography variant="omega">
                {formatMessage({
                  id: getTranslationKey('asset-details.replace.description'),
                  defaultMessage: 'Current content will be permanently replaced.',
                })}
              </Typography>
              {aiEnabled ? (
                <Typography variant="omega">
                  {formatMessage({
                    id: getTranslationKey('asset-details.replace.description.ai'),
                    defaultMessage: 'AI will generate new metadata after upload.',
                  })}
                </Typography>
              ) : null}
            </Flex>
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.Cancel>
              <Button variant="tertiary" fullWidth>
                {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
              </Button>
            </Dialog.Cancel>
            <Dialog.Action>
              <Button variant="secondary" onClick={handleReplaceContinue} fullWidth>
                {formatMessage({
                  id: getTranslationKey('asset-details.replace.continue'),
                  defaultMessage: 'Continue',
                })}
              </Button>
            </Dialog.Action>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
      {isMoveOpen && (
        <BulkMoveDialog
          open
          onClose={() => setIsMoveOpen(false)}
          items={moveItems}
          onSuccess={() => deselect(assetKey(asset.id))}
        />
      )}
      {/* Both dialogs live inside the row, so a background refetch that drops the
          row would take an open dialog with it. Nothing invalidates until the
          mutation resolves, and the dialog closes in the same tick, so the
          flows themselves can't trigger it. */}
      {isDeleteOpen && (
        <DeleteItemsDialog
          open
          onClose={() => setIsDeleteOpen(false)}
          target={{ fileIds: [asset.id], folderIds: [] }}
          onSuccess={() => deselect(assetKey(asset.id))}
        />
      )}
    </>
  );
};
