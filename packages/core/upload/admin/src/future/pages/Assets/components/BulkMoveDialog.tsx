import { useEffect, useMemo, useState } from 'react';

import { useNotification } from '@strapi/admin/strapi-admin';
import {
  Button,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import {
  useBulkMoveMutation,
  useGetFolderQuery,
  useGetFolderStructureQuery,
} from '../../../services/folders';
import { flattenFolderStructure } from '../../../utils/flattenFolderStructure';
import { getBulkMoveErrorMessage } from '../../../utils/getBulkMoveErrorMessage';
import { getTranslationKey } from '../../../utils/translations';
import { useAssetSelection } from '../hooks/useAssetSelection';
import { useFolderNavigation } from '../hooks/useFolderNavigation';

const StyledModalContent = styled(Modal.Content)`
  max-width: 51.6rem;
`;

interface BulkMoveDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Move elements to" modal for the bulk actions bar. Moves the current
 * selection (assets and/or folders) into the picked destination folder via
 * `POST /upload/actions/bulk-move`. The mutation invalidates the asset list,
 * folder list and the sidebar folder-structure, so both panes refresh on
 * success. On failure the modal stays open so the user can retry or cancel.
 */
export const BulkMoveDialog = ({ open, onClose }: BulkMoveDialogProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { selectedIds, selectedFolderIds, clear } = useAssetSelection();
  const { currentFolderId } = useFolderNavigation();
  const { data: folderStructure = [] } = useGetFolderStructureQuery(undefined, { skip: !open });
  const { data: currentFolder } = useGetFolderQuery(
    { id: currentFolderId! },
    { skip: currentFolderId === null }
  );
  const [bulkMove, { isLoading: isMoving }] = useBulkMoveMutation();

  // '' is the DOM-only sentinel for the Media Library root (null everywhere else).
  const [destination, setDestination] = useState<string>('');

  useEffect(() => {
    if (open) {
      setDestination('');
    }
  }, [open]);

  const rootLabel = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });

  // Options carry the full ancestry ("About / Images" vs "Tech / Images") so
  // same-named folders stay distinguishable, listed depth-first under their
  // parent. Selected folders and their descendants are pruned during the same
  // single walk — an item can't be moved into itself or below itself (the
  // server would reject it). Memoized: large libraries shouldn't re-walk the
  // tree on every dialog render.
  const destinationOptions = useMemo(
    () => flattenFolderStructure(folderStructure, selectedFolderIds),
    [folderStructure, selectedFolderIds]
  );

  const count = selectedIds.size + selectedFolderIds.size;

  const handleMove = async () => {
    if (isMoving) {
      return;
    }

    const destinationFolderId = destination === '' ? null : Number(destination);

    try {
      await bulkMove({
        fileIds: Array.from(selectedIds),
        folderIds: Array.from(selectedFolderIds),
        destinationFolderId,
      }).unwrap();
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

    const sourceName = currentFolderId === null ? rootLabel : (currentFolder?.name ?? rootLabel);
    const destinationName =
      destinationFolderId === null
        ? rootLabel
        : (destinationOptions.find((option) => option.id === destinationFolderId)?.label ??
          rootLabel);

    toggleNotification({
      type: 'success',
      message: formatMessage(
        {
          id: getTranslationKey('list.bulk-actions.move.success'),
          defaultMessage:
            '{count, plural, =1 {# element has} other {# elements have}} been moved from {source} to {destination}',
        },
        { count, source: sourceName, destination: destinationName }
      ),
    });
    clear();
    onClose();
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
        <Modal.Body>
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
              disabled={isMoving}
            >
              <SingleSelectOption value="">{rootLabel}</SingleSelectOption>
              {destinationOptions.map((option) => (
                <SingleSelectOption key={option.id} value={String(option.id)}>
                  {option.label}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Field.Root>
        </Modal.Body>
        <Modal.Footer>
          <Flex gap={2} justifyContent="space-between" width="100%">
            <Button variant="tertiary" onClick={onClose} disabled={isMoving} type="button">
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button onClick={handleMove} loading={isMoving}>
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
