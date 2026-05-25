import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  Field,
  Flex,
  Loader,
  SingleSelect,
  SingleSelectOption,
  Typography,
} from '@strapi/design-system';
import { ArrowRight } from '@strapi/icons';
import { useIntl } from 'react-intl';
import {
  useNotification,
  useAPIErrorHandler,
  adminApi,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { PERMISSIONS } from '../constants';
import { useGetMineSpacesQuery, useMoveToSpaceMutation } from '../services/spaces';
import { getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';

import type {
  BulkActionComponent,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

/* -------------------------------------------------------------------------- */
/*                              Shared picker UI                              */
/* -------------------------------------------------------------------------- */

interface MoveDialogContentProps {
  uid: string;
  documentIds: string[];
  onClose: () => void;
  /**
   * When true (header action from the edit view), the move leaves the user looking at
   * a document that no longer exists in their current space, so we navigate them back
   * to the collection list. The bulk action stays on the list and only needs cache
   * invalidation to drop the moved rows.
   */
  navigateToListOnSuccess?: boolean;
}

const MoveDialogContent = ({
  uid,
  documentIds,
  onClose,
  navigateToListOnSuccess = false,
}: MoveDialogContentProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const currentSlug = getCurrentSpaceSlug();
  const { data: spaces, isLoading } = useGetMineSpacesQuery({ contentType: uid });
  const [moveToSpace, { isLoading: isMoving }] = useMoveToSpaceMutation();

  // Eligible target list: spaces visible to this CT (filtered server-side), minus the
  // current space (moving an entry to the space it already lives in is a no-op).
  const eligible = React.useMemo(
    () => (spaces ?? []).filter((s) => s.slug !== currentSlug),
    [spaces, currentSlug]
  );
  const [selected, setSelected] = React.useState<string | null>(null);

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      const res = await moveToSpace({
        uid,
        documentIds,
        targetSpaceSlug: selected,
      }).unwrap();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('move.success'),
            defaultMessage:
              '{count, plural, one {Entry moved} other {# entries moved}} to {space}.',
          },
          { count: res.movedCount, space: selected }
        ),
      });
      // Refresh the content-manager list/detail caches that just became stale: the moved
      // rows now belong to a different space and should disappear from the current view.
      // This replaces a full page reload (which flashed a blank screen) with a targeted
      // RTK Query invalidation against the shared `adminApi` slice.
      // The 'Document' / 'CountDocuments' / 'RecentDocumentList' tag types are added
      // at runtime by `contentManagerApi.enhanceEndpoints(...)` (same singleton slice),
      // but content-manager doesn't re-export the enhanced typing, so we cast here.
      dispatch(
        adminApi.util.invalidateTags([
          { type: 'Document', id: `${uid}_LIST` },
          { type: 'Document', id: `${uid}_ALL_ITEMS` },
          ...documentIds.map((id) => ({ type: 'Document', id: `${uid}_${id}` })),
          'CountDocuments',
          'RecentDocumentList',
        ] as Parameters<typeof adminApi.util.invalidateTags>[0])
      );
      onClose();
      if (navigateToListOnSuccess) {
        // From the edit view: the document is no longer in this space, so a refetch
        // would 404. Route back to the collection list instead.
        navigate(`/content-manager/collection-types/${uid}`);
      }
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  const bodyText = formatMessage(
    {
      id: getTranslation('move.dialog.body'),
      defaultMessage:
        'Move {count, plural, one {this entry} other {these # entries}} to:',
    },
    { count: documentIds.length }
  );

  return (
    <>
      <Dialog.Body>
        <Flex direction="column" gap={4} alignItems="flex-start" width="100%">
          {isLoading ? (
            <Flex justifyContent="flex-start" padding={4}>
              <Loader>Loading spaces…</Loader>
            </Flex>
          ) : eligible.length === 0 ? (
            <Box padding={3} background="neutral100" hasRadius width="100%">
              <Typography variant="omega" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('move.dialog.empty'),
                  defaultMessage:
                    'No other space is eligible for this content type. Add a space to the CT’s "Visible in spaces" binding first.',
                })}
              </Typography>
            </Box>
          ) : (
            <Field.Root width="320px" maxWidth="50%">
              <Field.Label>{bodyText}</Field.Label>
              <SingleSelect
                value={selected ?? ''}
                placeholder={formatMessage({
                  id: getTranslation('move.dialog.placeholder'),
                  defaultMessage: 'Select a target space…',
                })}
                onChange={(value) => setSelected(value as string)}
              >
                {eligible.map((space) => (
                  <SingleSelectOption key={space.slug} value={space.slug}>
                    <Flex alignItems="center" gap={2}>
                      <Box
                        width="8px"
                        height="8px"
                        borderRadius="50%"
                        background={space.color ?? 'neutral300'}
                        shrink={0}
                      />
                      <Typography variant="omega">{space.name}</Typography>
                    </Flex>
                  </SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>
          )}
        </Flex>
      </Dialog.Body>
      <Dialog.Footer>
        <Flex gap={2} width="100%">
          <Button flex="auto" variant="tertiary" onClick={onClose} disabled={isMoving}>
            {formatMessage({
              id: getTranslation('move.dialog.cancel'),
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            flex="auto"
            variant="default"
            onClick={handleConfirm}
            loading={isMoving}
            disabled={!selected || isMoving || eligible.length === 0}
          >
            {formatMessage({
              id: getTranslation('move.dialog.confirm'),
              defaultMessage: 'Move',
            })}
          </Button>
        </Flex>
      </Dialog.Footer>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Header action (single)                          */
/* -------------------------------------------------------------------------- */

export const MoveToSpaceHeaderAction: DocumentActionComponent = ({
  document,
  documentId,
  model,
}) => {
  const { formatMessage } = useIntl();
  const { allowedActions } = useRBAC(PERMISSIONS);

  if (!documentId || !document) return null;
  if (!allowedActions.canMoveEntry) return null;

  return {
    position: ['header'],
    icon: <ArrowRight />,
    variant: 'secondary',
    label: formatMessage({
      id: getTranslation('move.action.label'),
      defaultMessage: 'Move to space…',
    }),
    dialog: {
      type: 'modal' as const,
      title: formatMessage({
        id: getTranslation('move.dialog.title'),
        defaultMessage: 'Move to another space',
      }),
      content: ({ onClose }: { onClose: () => void }) => (
        <MoveDialogContent
          uid={model}
          documentIds={[documentId]}
          onClose={onClose}
          navigateToListOnSuccess
        />
      ),
    },
  };
};

/* -------------------------------------------------------------------------- */
/*                              Bulk action (N)                               */
/* -------------------------------------------------------------------------- */

export const MoveToSpaceBulkAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  const { allowedActions } = useRBAC(PERMISSIONS);

  const documentIds = (documents ?? [])
    .map((d: any) => d.documentId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);

  if (documentIds.length === 0) return null;
  if (!allowedActions.canMoveEntry) return null;

  return {
    icon: <ArrowRight />,
    // Secondary on purpose — Move is not the primary action of the bulk toolbar.
    variant: 'secondary',
    label: formatMessage({
      id: getTranslation('move.action.label'),
      defaultMessage: 'Move to space…',
    }),
    dialog: {
      type: 'modal' as const,
      title: formatMessage({
        id: getTranslation('move.dialog.title'),
        defaultMessage: 'Move to another space',
      }),
      content: ({ onClose }: { onClose: () => void }) => (
        <MoveDialogContent uid={model} documentIds={documentIds} onClose={onClose} />
      ),
    },
  };
};
