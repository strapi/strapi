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

import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useReplaceAssetMutation } from '../../../services/assets';
import { useGetUploadSettingsQuery } from '../../../services/settings';
import { downloadFile } from '../../../utils/downloadFile';
import { prefixFileUrlWithBackendUrl } from '../../../utils/files';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';

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
 * Any successful move or delete clears the whole selection: a delete only
 * invalidates RTK tags, so without it an `asset:<id>` key for a file that no
 * longer exists would linger in the selection.
 */
export const AssetActionsMenu = ({ asset, dragData }: AssetActionsMenuProps) => {
  const { formatMessage } = useIntl();
  const { copy } = useClipboard();
  const { toggleNotification } = useNotification();
  const { clear } = useAssetSelection();
  const { canUpdate, canDownload, canCopyLink } = useMediaLibraryPermissions();
  const [replaceAsset, { isLoading: isReplacing }] = useReplaceAssetMutation();
  const { data: settings } = useGetUploadSettingsQuery();
  const aiEnabled = settings?.data?.aiMetadata ?? false;

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

    const res = await replaceAsset({ id: asset.id, file });

    if ('error' in res) {
      // `fetchBaseQuery` already unwraps the API envelope, so a server-sent
      // reason (file too large, unsupported type) lands directly on `message`.
      const { message } = res.error as { message?: string };
      toggleNotification({
        type: 'danger',
        message:
          message ??
          formatMessage({
            id: getTranslationKey('asset-details.replace.error'),
            defaultMessage: 'Failed to replace the file.',
          }),
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

  // Replace and the move/delete pair are the two permission-gated groups; the
  // separator between them only earns its place when both survive the gate.
  const showTopGroup = canUpdate || canCopyLink || canDownload;

  return (
    <>
      <VisuallyHidden>
        <input
          ref={fileInputRef}
          type="file"
          multiple={false}
          onChange={handleFileChange}
          aria-hidden
          tabIndex={-1}
        />
      </VisuallyHidden>
      <Menu.Root>
        <Menu.Trigger
          tag={IconButton}
          icon={<More />}
          variant="ghost"
          label={formatMessage({
            id: getTranslationKey('control-card.more-actions'),
            defaultMessage: 'More actions',
          })}
        />
        <Menu.Content popoverPlacement="bottom-end" zIndex={2} minWidth="22rem">
          {canUpdate && (
            <Menu.Item
              startIcon={<ArrowsCounterClockwise />}
              disabled={isReplacing}
              onSelect={() => setIsReplaceOpen(true)}
            >
              {formatMessage({
                id: getTranslationKey('list.asset.actions.replace'),
                defaultMessage: 'Replace media',
              })}
            </Menu.Item>
          )}
          {canCopyLink && (
            <Menu.Item startIcon={<Link />} onSelect={handleCopyLink}>
              {formatMessage({
                id: getTranslationKey('list.asset.actions.copy-link'),
                defaultMessage: 'Copy link to media',
              })}
            </Menu.Item>
          )}
          {canDownload && (
            <Menu.Item startIcon={<Download />} disabled={isDownloading} onSelect={handleDownload}>
              {formatMessage({
                id: getTranslationKey('list.asset.actions.download'),
                defaultMessage: 'Download media',
              })}
            </Menu.Item>
          )}
          {showTopGroup && canUpdate && <Menu.Separator />}
          {canUpdate && (
            <>
              <Menu.Item startIcon={<ArrowRight />} onSelect={() => setIsMoveOpen(true)}>
                {formatMessage({
                  id: getTranslationKey('list.asset.actions.move'),
                  defaultMessage: 'Move to folder',
                })}
              </Menu.Item>
              <Menu.Item
                startIcon={<Trash />}
                variant="danger"
                onSelect={() => setIsDeleteOpen(true)}
              >
                {formatMessage({
                  id: getTranslationKey('list.asset.actions.delete'),
                  defaultMessage: 'Delete',
                })}
              </Menu.Item>
            </>
          )}
        </Menu.Content>
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
          onSuccess={clear}
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
          onSuccess={clear}
        />
      )}
    </>
  );
};
