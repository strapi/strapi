import { useMemo, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import { Box, Button, Flex, IconButton, Tooltip, Typography } from '@strapi/design-system';
import { ArrowRight, Cross, Sparkle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  AI_METADATA_MAX_FILES,
  isAIMetadataSupportedMime,
} from '../../../../../../shared/constants';
import { useAIAvailability } from '../../../../hooks/useAiAvailability';
import { useMediaLibraryPermissions } from '../../../hooks/useMediaLibraryPermissions';
import { useGenerateAiMetadataMutation } from '../../../services/assets';
import { buildDragSetFromSelection } from '../../../utils/buildDragSetFromSelection';
import { emptyItemLocations, type ItemLocations } from '../../../utils/itemLocations';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

import { BulkMoveDialog } from './BulkMoveDialog';
import { DeleteItemsDialog } from './DeleteItemsDialog';

import type { File } from '../../../../../../shared/contracts/files';

/**
 * Floating bulk action bar for the future Media Library.
 */
const Bar = styled(Flex)`
  position: fixed;
  bottom: ${({ theme }) => theme.spaces[4]};
  left: 50%;
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndices.popover};
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
  padding: ${({ theme }) =>
    `${theme.spaces[3]} ${theme.spaces[2]} ${theme.spaces[3]} ${theme.spaces[6]}`};
  background: ${({ theme }) => theme.colors.neutral0};
  border: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-radius: ${({ theme }) => theme.borderRadius};
  box-shadow: ${({ theme }) => theme.shadows.popupShadow};
`;

const ActionCluster = styled(Flex)`
  margin-left: auto;
  align-items: center;
  gap: ${({ theme }) => theme.spaces[2]};
`;

const VerticalDivider = styled(Box)`
  width: 1px;
  align-self: stretch;
  background: ${({ theme }) => theme.colors.neutral150};
  margin-left: ${({ theme }) => theme.spaces[1]};
`;

interface BulkActionsBarProps {
  /**
   * The assets currently rendered in the list, used to resolve the mime types
   * of the selection — the bar needs them to know which selected assets the AI
   * provider can actually read.
   *
   * Selection is page-scoped and cleared whenever the list identity changes, so
   * every selected asset id is guaranteed to appear here.
   */
  assets?: File[];
  /**
   * Real location of every loaded row, so the move dialog validates each
   * selected item against its own parent. Defaults to a lookup that misses
   * everything, which falls back to the folder currently open.
   */
  locations?: ItemLocations;
}

export const BulkActionsBar = ({
  assets = [],
  locations = emptyItemLocations,
}: BulkActionsBarProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { isEnabled: isAiMetadataEnabled } = useAIAvailability();
  // Every bulk action (move, delete, metadata) is an `assets.update` mutation
  // server-side — one flag gates the whole cluster.
  const { canUpdate } = useMediaLibraryPermissions();
  const { selectedIds, selectedFolderIds, clear } = useAssetSelection();
  const { currentFolderId } = useFolderNavigation();
  const [generateAiMetadata, { isLoading: isGeneratingMetadata }] = useGenerateAiMetadataMutation();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMoveDialogOpen, setIsMoveDialogOpen] = useState(false);
  // The delete request lives in DeleteItemsDialog; the bar mirrors its pending
  // state so the rest of the controls stay disabled for the duration.
  const [isDeleting, setIsDeleting] = useState(false);

  const count = selectedIds.size + selectedFolderIds.size;
  const isBusy = isDeleting || isGeneratingMetadata;

  // Stable identity: the move dialog memoizes its destination walk on it. Each
  // item's real location comes from `locations`, so a selection made under a
  // global search validates against each item's own parent rather than the
  // folder currently open.
  const moveItems = useMemo(
    () => buildDragSetFromSelection(selectedIds, selectedFolderIds, locations, currentFolderId),
    [selectedIds, selectedFolderIds, locations, currentFolderId]
  );

  /**
   * The server processes the whole selection inside a single request and
   * rejects anything above the cap with a 400. Disable the action up front so
   * the limit is discoverable before the user commits to a request.
   */
  const isOverMetadataLimit = selectedIds.size > AI_METADATA_MAX_FILES;

  /**
   * How many selected assets the AI provider can actually read. The server
   * stays authoritative — it still reports what it skipped — but a selection
   * with nothing eligible (a lone PDF, say) would only ever come back fully
   * skipped, so there is no point sending it.
   */
  const eligibleCount = useMemo(() => {
    const mimeById = new Map(assets.map(({ id, mime }) => [id, mime]));

    return [...selectedIds].filter((id) => isAIMetadataSupportedMime(mimeById.get(id))).length;
  }, [assets, selectedIds]);

  const hasNoEligibleAssets = selectedIds.size > 0 && eligibleCount === 0;

  /**
   * Why the action is unavailable, surfaced on hover. `undefined` leaves the
   * button without a tooltip — either it is usable, or it is disabled for a
   * reason the selection count already makes obvious.
   */
  let metadataDisabledReason: string | undefined;

  if (isOverMetadataLimit) {
    metadataDisabledReason = formatMessage(
      {
        id: getTranslationKey('list.bulk-actions.create-metadata.too-many'),
        defaultMessage:
          'Metadata can be generated for up to {max} assets at a time. Select fewer assets to continue.',
      },
      { max: AI_METADATA_MAX_FILES }
    );
  } else if (hasNoEligibleAssets) {
    metadataDisabledReason = formatMessage({
      id: getTranslationKey('list.bulk-actions.create-metadata.no-eligible'),
      defaultMessage:
        'Metadata can only be generated for images. None of the selected assets are supported.',
    });
  }

  /**
   * Metadata generation only applies to images — folders and unsupported files
   * in the selection are reported back rather than blocking the action.
   */
  const handleCreateMetadata = async () => {
    // Guard re-entry while pending, and never send a selection the server
    // would reject outright or skip in full.
    if (isGeneratingMetadata || isOverMetadataLimit || hasNoEligibleAssets) {
      return;
    }

    const fileIds = Array.from(selectedIds);
    const res = await generateAiMetadata({ fileIds });

    if ('error' in res) {
      // Keep the selection intact so the user can retry.
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('list.bulk-actions.create-metadata.error'),
          defaultMessage: 'An error occurred while generating metadata.',
        }),
      });
      return;
    }

    const successCount = res.data.filter(({ status }) => status === 'success').length;
    const skippedCount = res.data.filter(({ status }) => status === 'skipped').length;
    const errorCount = res.data.filter(({ status }) => status === 'error').length;
    // Folders are never sent, so they are not part of the response — but the
    // user selected them, and a silent omission reads as a bug.
    const folderCount = selectedFolderIds.size;

    if (errorCount === res.data.length) {
      // Nothing was written — treat it like a request-level failure and keep
      // the selection so the user can retry.
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslationKey('list.bulk-actions.create-metadata.error'),
          defaultMessage: 'An error occurred while generating metadata.',
        }),
      });
      return;
    }

    if (skippedCount === 0 && errorCount === 0 && folderCount === 0) {
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslationKey('list.bulk-actions.create-metadata.success'),
            defaultMessage:
              '{count, plural, =1 {Metadata generated for # asset} other {Metadata generated for # assets}}',
          },
          { count: successCount }
        ),
      });
    } else {
      // Partial outcome: report every bucket so the user knows what was left
      // out — including folders, which were never eligible in the first place.
      toggleNotification({
        type: 'warning',
        message: formatMessage(
          {
            id: getTranslationKey('list.bulk-actions.create-metadata.partial'),
            defaultMessage:
              '{successCount} generated, {skippedCount} skipped (unsupported file type), {errorCount} failed{folderCount, plural, =0 {} one {, # folder ignored} other {, # folders ignored}}',
          },
          { successCount, skippedCount, errorCount, folderCount }
        ),
      });
    }

    clear();
  };

  // Every bulk action is behind `assets.update`; with nothing selected, or
  // without the permission, the bar has nothing to offer — drop it entirely
  // rather than show a count + "Clear selection" over no actions (mirrors the
  // drawer footer, which hides when no permitted action survives).
  if (count === 0 || !canUpdate) {
    return null;
  }

  return (
    <Bar
      tag="section"
      role="region"
      aria-label={formatMessage({
        id: getTranslationKey('list.bulk-actions.label'),
        defaultMessage: 'Bulk actions',
      })}
    >
      <Typography fontWeight="bold" textColor="neutral800" marginRight={4}>
        {formatMessage(
          {
            id: getTranslationKey('list.bulk-actions.selected-count'),
            defaultMessage: '{count, plural, =1 {# item selected} other {# items selected}}',
          },
          { count }
        )}
      </Typography>

      {/* Past the early return the user always has `assets.update`, so the
          individual actions no longer re-check it. */}
      <ActionCluster>
        {isAiMetadataEnabled && (
          <Tooltip label={metadataDisabledReason}>
            {/* Wrapped so the tooltip still receives pointer events while the
                button itself is disabled. */}
            <Box>
              <Button
                size="S"
                startIcon={<Sparkle />}
                disabled={
                  isBusy || selectedIds.size === 0 || isOverMetadataLimit || hasNoEligibleAssets
                }
                loading={isGeneratingMetadata}
                onClick={handleCreateMetadata}
              >
                {formatMessage({
                  id: getTranslationKey('list.bulk-actions.create-metadata'),
                  defaultMessage: 'Create metadata',
                })}
              </Button>
            </Box>
          </Tooltip>
        )}

        <IconButton
          variant="tertiary"
          disabled={isBusy}
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.move'),
            defaultMessage: 'Move',
          })}
          onClick={() => setIsMoveDialogOpen(true)}
        >
          <ArrowRight />
        </IconButton>
        <BulkMoveDialog
          open={isMoveDialogOpen}
          onClose={() => setIsMoveDialogOpen(false)}
          items={moveItems}
          onSuccess={clear}
        />

        <IconButton
          variant="danger-light"
          disabled={isBusy}
          label={formatMessage({
            id: getTranslationKey('list.bulk-actions.delete'),
            defaultMessage: 'Delete',
          })}
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash />
        </IconButton>
        <DeleteItemsDialog
          open={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          target={{
            fileIds: Array.from(selectedIds),
            folderIds: Array.from(selectedFolderIds),
          }}
          onSuccess={clear}
          onPendingChange={setIsDeleting}
        />
      </ActionCluster>

      <VerticalDivider aria-hidden />

      <IconButton
        variant="ghost"
        label={formatMessage({
          id: getTranslationKey('list.bulk-actions.clear'),
          defaultMessage: 'Clear selection',
        })}
        onClick={clear}
        disabled={isBusy}
      >
        <Cross />
      </IconButton>
    </Bar>
  );
};
