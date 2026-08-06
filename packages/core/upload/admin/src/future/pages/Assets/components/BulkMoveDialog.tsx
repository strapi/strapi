import { useEffect, useMemo, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  useBulkMoveMutation,
  useGetFolderQuery,
  useGetFolderStructureQuery,
} from '../../../services/folders';
import { canDropItemOnFolder } from '../../../utils/canDropItemOnFolder';
import { flattenFolderStructure } from '../../../utils/flattenFolderStructure';
import { formatMoveSuccessMessage } from '../../../utils/formatMoveSuccessMessage';
import { getBulkMoveErrorMessage } from '../../../utils/getBulkMoveErrorMessage';
import { hasUniformSource, uniformSourceFolderId } from '../../../utils/itemSource';
import { getTranslationKey } from '../../../utils/translations';

import type { DragItemData } from '../../../types/dnd';

const StyledModalContent = styled(Modal.Content)`
  max-width: 51.6rem;
`;

interface BulkMoveDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Items to move, as drag data so destination validation sees each item's real
   * parent — the current folder is not a reliable stand-in once results come
   * from a global search.
   */
  items: DragItemData[];
  onSuccess?: () => void;
}

/**
 * "Move elements to" modal. Moves the given items (assets and/or folders) into
 * the picked destination folder via `POST /upload/actions/bulk-move`. The
 * mutation invalidates the asset list, folder list and the sidebar
 * folder-structure, so both panes refresh on success. On failure the modal stays
 * open so the user can retry or cancel.
 *
 * Used both by the bulk actions bar (the whole selection) and by a folder's
 * actions menu (that one folder).
 */
export const BulkMoveDialog = ({ open, onClose, items, onSuccess }: BulkMoveDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const {
    data: folderStructure = [],
    isUninitialized: isStructureUninitialized,
    isLoading: isLoadingStructure,
    isError: isStructureError,
  } = useGetFolderStructureQuery(undefined, { skip: !open });
  const [bulkMove, { isLoading: isMoving }] = useBulkMoveMutation();

  const fileIds = useMemo(
    () => items.filter((item) => item.kind === 'file').map((item) => item.id),
    [items]
  );
  const folderIds = useMemo(
    () => items.filter((item) => item.kind === 'folder').map((item) => item.id),
    [items]
  );

  // A selection made under a global search can span folders, so the source is
  // nameable only when every item agrees on it — `null` otherwise, and the toast
  // then omits the source rather than crediting one item's folder to all of them.
  // The bar can also hand over an empty set, which is likewise unnameable.
  const isSourceUniform = hasUniformSource(items);
  const sourceFolderId = uniformSourceFolderId(items);
  const { data: sourceFolder } = useGetFolderQuery(
    { id: sourceFolderId! },
    { skip: sourceFolderId === null }
  );

  // '' is the DOM-only sentinel for the Media Library root (null everywhere else).
  const [destination, setDestination] = useState<string>('');

  const rootLabel = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });

  // Options carry the full ancestry ("About / Images" vs "Tech / Images") so
  // same-named folders stay distinguishable, listed depth-first under their
  // parent. The moved folders and their descendants are pruned during the same
  // single walk — an item can't be moved into itself or below itself (the
  // server would reject it). The folder the items already live in is filtered
  // out too via `canDropItemOnFolder`, so we never offer a no-op move.
  // Memoized: large libraries shouldn't re-walk the tree on every render.
  const destinationOptions = useMemo(
    () =>
      flattenFolderStructure(folderStructure, new Set(folderIds)).filter((option) =>
        canDropItemOnFolder({ items, targetFolderId: option.id, folderStructure })
      ),
    [folderStructure, folderIds, items]
  );

  // Hide the root option when the items already live at root — dropping there
  // would be a no-op. Uses the same predicate as the DnD highlight.
  const canMoveToRoot = useMemo(
    () => canDropItemOnFolder({ items, targetFolderId: null, folderStructure }),
    [items, folderStructure]
  );

  // The default has to be an option that is actually rendered, or the select
  // shows blank: root is absent when the items already live there, and the
  // folder options only exist once the structure query has resolved.
  const defaultDestination = canMoveToRoot ? '' : (destinationOptions[0]?.id.toString() ?? '');

  // Re-derived rather than only reset on open, because the options arrive after
  // the first render. It is a primitive, so a background refetch that produces
  // the same default won't discard a destination the user already picked.
  useEffect(() => {
    setDestination(defaultDestination);
  }, [open, defaultDestination]);

  // Until the structure resolves there are no options, so the default falls
  // back to root ('') — which for a root-level item is the no-op destination
  // that was deliberately filtered out. Nothing may be submitted before this.
  const isStructureReady = !isStructureUninitialized && !isLoadingStructure && !isStructureError;

  // Moving a single folder that already sits next to every other folder leaves
  // nowhere to go; say so instead of showing an empty select. Only once the
  // structure has arrived — an in-flight or failed fetch also has no options,
  // and a failure is a different story to tell.
  const hasNoDestination = isStructureReady && destinationOptions.length === 0 && !canMoveToRoot;

  const count = items.length;

  const handleMove = async () => {
    // The button is disabled in both cases; the dialog can also be submitted
    // from the keyboard, so guard here too.
    if (isMoving || !isStructureReady) {
      return;
    }

    const destinationFolderId = destination === '' ? null : Number(destination);

    try {
      await bulkMove({ fileIds, folderIds, destinationFolderId }).unwrap();
    } catch (error) {
      // Keep the modal open and the selection intact so the user can retry
      // (e.g. after picking a valid destination) or cancel. Surface the server
      // message when there is one — it carries actionable causes like moving a
      // folder into its own descendant or a name collision in the destination.
      toggleNotification({
        type: 'danger',
        message: getBulkMoveErrorMessage(
          error,
          formatMessage({
            id: getTranslationKey('list.bulk-actions.move.error'),
            defaultMessage: 'An error occurred while moving the items.',
          })
        ),
      });
      return;
    }

    // A uniform source with a `null` id is the Media Library root — a real name.
    // Only a set that genuinely spans folders has no source to report.
    const sourceName = !isSourceUniform
      ? null
      : sourceFolderId === null
        ? rootLabel
        : (sourceFolder?.name ?? rootLabel);
    const destinationName =
      destinationFolderId === null
        ? rootLabel
        : (destinationOptions.find((option) => option.id === destinationFolderId)?.label ??
          rootLabel);

    toggleNotification({
      type: 'success',
      message: formatMoveSuccessMessage({
        formatMessage,
        count,
        source: sourceName,
        destination: destinationName,
      }),
    });
    onSuccess?.();
    onClose();
  };

  // Three states: a failed structure request, a genuine dead end, and the
  // select — which also covers the loading window, so the hint and the error
  // don't flash in ahead of the options.
  const renderBody = () => {
    if (isStructureError) {
      return (
        <Typography textColor="danger600">
          {formatMessage({
            id: getTranslationKey('list.bulk-actions.move.load-error'),
            defaultMessage: "Couldn't load the folder list. Please try again.",
          })}
        </Typography>
      );
    }

    if (hasNoDestination) {
      return (
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslationKey('list.bulk-actions.move.no-destination'),
            defaultMessage: 'There is no other folder to move this to.',
          })}
        </Typography>
      );
    }

    return (
      <Field.Root name="destination">
        <Field.Label>
          {formatMessage({
            id: getTranslationKey('list.bulk-actions.move.location'),
            defaultMessage: 'Location',
          })}
        </Field.Label>
        <SingleSelect
          value={destination}
          onChange={(value) => setDestination(String(value))}
          disabled={isMoving || !isStructureReady}
        >
          {canMoveToRoot && <SingleSelectOption value="">{rootLabel}</SingleSelectOption>}
          {destinationOptions.map((option) => (
            <SingleSelectOption key={option.id} value={String(option.id)}>
              {option.label}
            </SingleSelectOption>
          ))}
        </SingleSelect>
      </Field.Root>
    );
  };

  return (
    <Modal.Root
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        // The modal must stay open while the request runs — the loader on the
        // Move button is the source of truth for the pending state.
        if (!nextOpen && !isMoving) {
          onClose();
        }
      }}
    >
      <StyledModalContent>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslationKey('list.bulk-actions.move.title'),
              defaultMessage: 'Move elements to',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{renderBody()}</Modal.Body>
        <Modal.Footer>
          <Flex gap={2} justifyContent="space-between" width="100%">
            <Button variant="tertiary" onClick={onClose} disabled={isMoving} type="button">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              onClick={handleMove}
              loading={isMoving}
              disabled={!isStructureReady || hasNoDestination}
            >
              {formatMessage({
                id: getTranslationKey('list.bulk-actions.move.submit'),
                defaultMessage: 'Move',
              })}
            </Button>
          </Flex>
        </Modal.Footer>
      </StyledModalContent>
    </Modal.Root>
  );
};
