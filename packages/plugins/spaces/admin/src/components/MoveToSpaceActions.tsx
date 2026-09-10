import * as React from 'react';

import {
  Alert,
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
import { ArrowRight, Earth } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNotification, useAPIErrorHandler, adminApi, useRBAC } from '@strapi/admin/strapi-admin';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

/* Same trick as the admin's ErrorElement: the DS Alert has no "static" mode,
   so the close button is hidden for this always-on informational use. */
const StaticAlert = styled(Alert)`
  & > button {
    display: none;
  }
`;

import { PERMISSIONS } from '../constants';
import { useGetMineSpacesQuery, useMoveToSpaceMutation } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { clearEntryStateCache, useEntryStates } from '../utils/entryStates';
import { clearInheritanceCache } from '../utils/inheritanceStates';
import { getTranslation } from '../utils/getTranslation';

import type { EntrySpace } from '../services/spaces';
import type {
  BulkActionComponent,
  DocumentActionComponent,
} from '@strapi/content-manager/strapi-admin';

/* -------------------------------------------------------------------------- */
/*                              Shared picker UI                              */
/* -------------------------------------------------------------------------- */

/** Pseudo target of the picker: share the entries with every workspace. */
const SHARED_TARGET = '__shared__';

interface MoveDialogContentProps {
  uid: string;
  documentIds: string[];
  onClose: () => void;
  /**
   * When true (header action from the edit view in a sub-workspace), the move leaves
   * the user looking at a document that no longer exists in their workspace, so we
   * navigate them back to the collection list. The bulk action stays on the list and
   * only needs cache invalidation to drop the moved rows.
   */
  navigateToListOnSuccess?: boolean;
  /**
   * The workspace to leave out of the picker — the one the entries already live
   * in, since moving them there is a no-op. Omit it (or pass `null`, meaning the
   * entries are shared and live nowhere in particular) to offer every workspace.
   *
   * There is deliberately no default: it used to fall back to the *current*
   * workspace, which silently dropped "Default" from the list when un-sharing an
   * entry from the default workspace — the one target a user is most likely to
   * want.
   */
  excludeSlug?: string | null;
  /**
   * Whether "Shared with every workspace" is offered as a target. Explicit
   * rather than derived from `excludeSlug`, because the two cases where there
   * is nothing to exclude mean opposite things: a bulk move from default may
   * share, while un-sharing an entry must not offer sharing back.
   */
  allowSharing: boolean;
  /** Overrides the confirm button's label (un-sharing does not read as "Move"). */
  confirmLabel?: { id: string; defaultMessage: string };
  onSuccess?: () => void;
}

const MoveDialogContent = ({
  uid,
  documentIds,
  onClose,
  navigateToListOnSuccess = false,
  excludeSlug,
  allowSharing,
  confirmLabel,
  onSuccess,
}: MoveDialogContentProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data: spaces, isLoading } = useGetMineSpacesQuery({ contentType: uid });
  const [moveToSpace, { isLoading: isMoving }] = useMoveToSpaceMutation();

  // Eligible target list: spaces visible to this CT (filtered server-side), minus the
  // one the entries already live in (moving there is a no-op).
  const eligible = React.useMemo(
    () => (spaces ?? []).filter((s) => !excludeSlug || s.slug !== excludeSlug),
    [spaces, excludeSlug]
  );
  const canShare = allowSharing && getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;
  const [selected, setSelected] = React.useState<string | null>(null);

  const sharedLabel = formatMessage({
    id: getTranslation('move.dialog.shared'),
    defaultMessage: 'Shared with every workspace',
  });

  const handleConfirm = async () => {
    if (!selected) return;
    try {
      const res = await moveToSpace({
        uid,
        documentIds,
        targetSpaceSlug: selected === SHARED_TARGET ? null : selected,
      }).unwrap();
      clearEntryStateCache();
      clearInheritanceCache();
      toggleNotification({
        type: 'success',
        message: formatMessage(
          {
            id: getTranslation('move.success'),
            defaultMessage:
              '{count, plural, one {Entry moved} other {# entries moved}} to {space}.',
          },
          {
            count: res.movedCount,
            space:
              selected === SHARED_TARGET
                ? sharedLabel.toLowerCase()
                : (spaces?.find((s) => s.slug === selected)?.name ?? selected),
          }
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
      onSuccess?.();
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
      defaultMessage: 'Move {count, plural, one {this entry} other {these # entries}} to:',
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
          ) : eligible.length === 0 && !canShare ? (
            <StaticAlert
              variant="warning"
              width="100%"
              onClose={() => {}}
              closeLabel=""
              title={formatMessage({
                id: getTranslation('move.dialog.empty.title'),
                defaultMessage: 'This entry cannot be moved to another workspace.',
              })}
            >
              {formatMessage({
                id: getTranslation('move.dialog.empty.hint'),
                defaultMessage:
                  'This content type only exists in the current workspace — add another workspace to its "Workspaces" selection in the Content-Type Builder first.',
              })}
            </StaticAlert>
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
                {canShare ? (
                  <SingleSelectOption value={SHARED_TARGET}>
                    <Flex alignItems="center" gap={2}>
                      <Earth fill="neutral500" width="1.2rem" height="1.2rem" />
                      <Typography variant="omega">{sharedLabel}</Typography>
                    </Flex>
                  </SingleSelectOption>
                ) : null}
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
          {/* No target, no Move button — the warning block says why. */}
          {(eligible.length > 0 || canShare) && (
            <Button
              flex="auto"
              variant="default"
              onClick={handleConfirm}
              loading={isMoving}
              disabled={!selected || isMoving}
            >
              {formatMessage(
                confirmLabel ?? {
                  id: getTranslation('move.dialog.confirm'),
                  defaultMessage: 'Move',
                }
              )}
            </Button>
          )}
        </Flex>
      </Dialog.Footer>
    </>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Header action (single)                          */
/* -------------------------------------------------------------------------- */

export { MoveDialogContent };

export const MoveToSpaceHeaderAction: DocumentActionComponent = ({
  document,
  documentId,
  model,
}) => {
  const { formatMessage } = useIntl();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const isDefault = getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;

  /**
   * The Content Manager renders every document action once per row of the list
   * view as well as once in the edit view, so anything this component asks for
   * is asked a page at a time. In the default workspace the answer is already
   * on the row: `space` travels with it (the Workspace column and the bulk
   * action read it), default may move anything that belongs to a workspace,
   * and a shared entry (`null`) is not moved at all.
   *
   * Outside default the row is not enough. A shared content type's rows stay
   * visible with whatever workspace stamped them, so a non-null `space` there
   * does not mean this workspace may write it — only the entry state knows,
   * and it costs one batched request per page.
   */
  const spaceOnDocument = (document as { space?: EntrySpace | null } | undefined)?.space;
  const known = isDefault && spaceOnDocument !== undefined;
  const states = useEntryStates(known ? '' : model, known || !documentId ? [] : [documentId]);
  const state = documentId ? states[documentId] : undefined;
  const space = known ? (spaceOnDocument ?? null) : (state?.space ?? null);

  if (!documentId || !document) return null;
  if (!allowedActions.canMoveEntry) return null;
  // A shared entry is not moved; a sub-workspace cannot move what it cannot edit.
  if (!known && (!state || !state.editable)) return null;
  if (space === null) return null;

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
          // Default keeps seeing the document wherever it goes.
          navigateToListOnSuccess={!isDefault}
          excludeSlug={isDefault ? space.slug : getCurrentSpaceSlug()}
          // The action is hidden on shared entries, so this is always an owned
          // one: sharing it is a legitimate target from default.
          allowSharing={isDefault}
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
  const isDefault = getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;

  const documentIds = (documents ?? [])
    .map((d: any) => d.documentId)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0);
  // The list rows carry `space` (`null` = shared): a selection holding a shared
  // entry is not offered a move.
  const hasSharedEntry = (documents ?? []).some((d: any) => d.space === null);

  if (documentIds.length === 0) return null;
  if (!allowedActions.canMoveEntry) return null;
  if (hasSharedEntry) return null;

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
        <MoveDialogContent
          uid={model}
          documentIds={documentIds}
          onClose={onClose}
          // Selected rows may come from several workspaces in default: exclude nothing.
          excludeSlug={isDefault ? undefined : getCurrentSpaceSlug()}
          allowSharing={isDefault}
        />
      ),
    },
  };
};
