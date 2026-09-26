import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { useClipboard, useNotification } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Flex, Menu, Typography, VisuallyHidden } from '@strapi/design-system';
import { ArrowRight, ArrowsCounterClockwise, Download, Link, Trash } from '@strapi/icons';
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

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';

import type { File } from '../../../../../shared/contracts/files';
import type { DragFileData } from '../../../types/dnd';

interface AssetActionsRender {
  /** The `Menu.Item`s, for whichever trigger is rendering them. */
  items: ReactNode;
  /**
   * The replace file input and the three dialogs. Rendered outside `Menu.Root`
   * by every caller: Radix unmounts menu content on close, and a dialog opened
   * from a menu item has to outlive the menu that opened it.
   */
  dialogs: ReactNode;
  /**
   * False once RBAC has settled and every action is gated away. Callers render
   * no trigger at all in that case — an empty popup is worse than none.
   */
  hasActions: boolean;
  /**
   * True while anything the actions own is still in play — a dialog, or the
   * native file picker. A cursor-anchored caller is mounted only as long as it
   * has something on screen, so it needs this to know it must stay around
   * after the menu closes.
   */
  isBusy: boolean;
}

/**
 * The asset actions themselves — items, dialogs and handlers — with no opinion
 * about how the menu is opened. A render-prop rather than a hook because it
 * produces JSX, and the repo reserves `use*.tsx` for tests.
 *
 * Both entry points (the row's `•••` trigger and the right-click menu anchored
 * at the cursor) render what this returns, so neither can drift from the other:
 * adding an action or changing a permission gate happens here, once.
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
 * list — would linger.
 */
/** The subset of the RBAC answer these actions are gated on. */
export interface AssetActionPermissions {
  isLoading: boolean;
  canUpdate: boolean;
  canDownload: boolean;
  canCopyLink: boolean;
}

interface AssetActionsProps {
  asset: File;
  dragData: DragFileData;
  /**
   * Already-resolved permissions, for a caller that mounts on demand.
   *
   * `useRBAC` starts every instance at `isLoading: true` with each flag false,
   * so a menu mounted by a right-click would render empty for a tick — an open
   * popup with nothing in it. A caller that has been mounted all along (the
   * context menu provider) has the answer already and passes it here. Omitted
   * by the `•••` trigger, which is mounted with its row and has no such gap.
   */
  permissions?: AssetActionPermissions;
  /** Receives the items and dialogs to place around whichever trigger it owns. */
  children: (actions: AssetActionsRender) => ReactNode;
}

export const AssetActions = ({ asset, dragData, permissions, children }: AssetActionsProps) => {
  const { formatMessage } = useIntl();
  const getErrorMessage = useApiErrorMessage();
  const { copy } = useClipboard();
  const { toggleNotification } = useNotification();
  const { deselect } = useAssetSelection();
  // Absent in the asset picker and in unit tests: the replace still runs, it
  // just renders no row-level overlay.
  const markBusy = useBusyAssetsOptional()?.markBusy ?? (() => () => {});
  // Always called — hooks can't be conditional — but ignored when the caller
  // supplied an answer it resolved earlier.
  const ownPermissions = useMediaLibraryPermissions();
  const {
    canUpdate,
    canDownload,
    canCopyLink,
    isLoading: isLoadingPermissions,
  } = permissions ?? ownPermissions;
  const [replaceAsset, { isLoading: isReplacing }] = useReplaceAssetMutation();
  const aiEnabled = useAIMetadataEnabled({ mime: asset.mime });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  // The native picker is not a React thing: nothing re-renders while it is up.
  // A cursor-anchored caller is mounted only while it has something on screen,
  // and without this the input it owns would be unmounted the moment the
  // confirm dialog closes — so the file would come back to nothing.
  const [isAwaitingFile, setIsAwaitingFile] = useState(false);

  // Stable identity: the move dialog memoizes its destination walk on it.
  const moveItems = useMemo(() => [dragData], [dragData]);

  // Confirm first, then open the native picker, so the user only commits to
  // replacing after acknowledging the warning (same order as the drawer).
  // Dismissing the picker fires `cancel`, not `change`, so without this the
  // caller would stay mounted with nothing on screen. Attached natively: the
  // React version here has no `onCancel` on the input types.
  useEffect(() => {
    const input = fileInputRef.current;

    if (!input) {
      return undefined;
    }

    const handleCancel = () => setIsAwaitingFile(false);

    input.addEventListener('cancel', handleCancel);

    return () => input.removeEventListener('cancel', handleCancel);
  }, []);

  const handleReplaceContinue = () => {
    setIsReplaceOpen(false);
    setIsAwaitingFile(true);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the native input so the same file can be picked again later.
    event.target.value = '';
    setIsAwaitingFile(false);

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

  const items = (
    <>
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
          <Menu.Item startIcon={<Trash />} variant="danger" onSelect={() => setIsDeleteOpen(true)}>
            {formatMessage({
              id: getTranslationKey('list.assets.actions.delete'),
              defaultMessage: 'Delete',
            })}
          </Menu.Item>
        </>
      )}
    </>
  );

  const dialogs = (
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

  return (
    <>
      {children({
        items,
        dialogs,
        // Every flag is `false` until the RBAC check settles, so wait for it —
        // otherwise the trigger unmounts and remounts on first paint for everyone.
        hasActions: isLoadingPermissions || hasTopGroup || hasBottomGroup,
        isBusy: isReplaceOpen || isMoveOpen || isDeleteOpen || isAwaitingFile,
      })}
    </>
  );
};
