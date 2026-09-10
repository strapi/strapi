import * as React from 'react';

import { useNotification, useAPIErrorHandler, adminApi, useRBAC } from '@strapi/admin/strapi-admin';
import { Button, Dialog, Flex, Typography } from '@strapi/design-system';
import { ArrowRight, Duplicate, Earth, Lock } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

import { PERMISSIONS } from '../constants';
import {
  useMoveToSpaceMutation,
  useOverrideEntryMutation,
  useResetOverrideMutation,
} from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { clearEntryStateCache, useEntryStates } from '../utils/entryStates';
import { clearInheritanceCache } from '../utils/inheritanceStates';
import { getTranslation } from '../utils/getTranslation';
import { LOCK_MESSAGES } from './EntryLockHeaderAction';
import { InheritanceSection } from './InheritanceSection';
import { MoveDialogContent } from './MoveToSpaceActions';
import { WorkspaceChip } from './WorkspaceChip';

import type { EntryState } from '../services/spaces';
import type { PanelComponent } from '@strapi/content-manager/strapi-admin';

interface WorkspacePanelContentProps {
  model: string;
  documentId: string;
  state: EntryState;
}

const DefaultWorkspacePanelContent = ({ model, documentId, state }: WorkspacePanelContentProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const [moveToSpace, { isLoading: isSharing }] = useMoveToSpaceMutation();
  const [isMoveOpen, setIsMoveOpen] = React.useState(false);
  const [isUnshareOpen, setIsUnshareOpen] = React.useState(false);
  const isShared = state.space === null;

  const invalidateDocument = () => {
    clearEntryStateCache();
    clearInheritanceCache();
    dispatch(
      adminApi.util.invalidateTags([
        { type: 'Document', id: `${model}_LIST` },
        { type: 'Document', id: `${model}_${documentId}` },
      ] as unknown as Parameters<typeof adminApi.util.invalidateTags>[0])
    );
  };

  const handleShare = async () => {
    try {
      await moveToSpace({ uid: model, documentIds: [documentId], targetSpaceSlug: null }).unwrap();
      invalidateDocument();
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('panel.share.success'),
          defaultMessage: 'Entry shared with every workspace.',
        }),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslation('panel.belongsTo'),
            defaultMessage: 'This entry belongs to',
          })}
        </Typography>
        <WorkspaceChip space={state.space} />
        {state.space === null ? (
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('panel.shared.hint'),
              defaultMessage:
                'Visible in every workspace, editable from the Default workspace only.',
            })}
          </Typography>
        ) : null}
      </Flex>

      {isShared ? <InheritanceSection model={model} documentId={documentId} /> : null}

      {allowedActions.canMoveEntry ? (
        <Flex direction="column" alignItems="stretch" gap={2}>
          {isShared ? (
            /* Sharing is reversible: hand the entry back to one workspace. The
               server treats it as an ordinary move (the row's `space_id` stops
               being NULL), so the same dialog does it — minus the "share" target,
               which would be a no-op here. */
            <Dialog.Root open={isUnshareOpen} onOpenChange={setIsUnshareOpen}>
              <Dialog.Trigger>
                <Button variant="secondary" startIcon={<Lock />} fullWidth>
                  {formatMessage({
                    id: getTranslation('panel.unshare.action'),
                    defaultMessage: 'Stop sharing…',
                  })}
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  {formatMessage({
                    id: getTranslation('panel.unshare.dialog.title'),
                    defaultMessage: 'Stop sharing this entry',
                  })}
                </Dialog.Header>
                <MoveDialogContent
                  uid={model}
                  documentIds={[documentId]}
                  onClose={() => setIsUnshareOpen(false)}
                  excludeSlug={undefined}
                  allowSharing={false}
                  confirmLabel={{
                    id: getTranslation('panel.unshare.confirm'),
                    defaultMessage: 'Stop sharing',
                  }}
                  onSuccess={invalidateDocument}
                />
              </Dialog.Content>
            </Dialog.Root>
          ) : null}
          {!isShared ? (
            <Button
              variant="secondary"
              startIcon={<Earth />}
              onClick={handleShare}
              loading={isSharing}
              fullWidth
            >
              {formatMessage({
                id: getTranslation('panel.share.action'),
                defaultMessage: 'Share with every workspace',
              })}
            </Button>
          ) : null}
          {!isShared ? (
            <Dialog.Root open={isMoveOpen} onOpenChange={setIsMoveOpen}>
              <Dialog.Trigger>
                <Button variant="tertiary" startIcon={<ArrowRight />} fullWidth>
                  {formatMessage({
                    id: getTranslation('panel.move.action'),
                    defaultMessage: 'Move to a workspace…',
                  })}
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <Dialog.Header>
                  {formatMessage({
                    id: getTranslation('move.dialog.title'),
                    defaultMessage: 'Move to another workspace',
                  })}
                </Dialog.Header>
                <MoveDialogContent
                  uid={model}
                  documentIds={[documentId]}
                  onClose={() => setIsMoveOpen(false)}
                  excludeSlug={state.space?.slug ?? null}
                  // The panel already has a dedicated "Share with every
                  // workspace" button; offering it again in the picker would be
                  // the same action twice.
                  allowSharing={false}
                  onSuccess={invalidateDocument}
                />
              </Dialog.Content>
            </Dialog.Root>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  );
};

/**
 * The sub-workspace side of inheritance.
 *
 * An inherited entry is read-only here because it is the same row every
 * workspace reads. Overriding takes a local copy — same entry, this
 * workspace's version of it — and resetting throws the copy away and puts the
 * workspace back on the original.
 */
const SubWorkspacePanelContent = ({ model, documentId, state }: WorkspacePanelContentProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const dispatch = useDispatch();
  const [overrideEntry, { isLoading: isOverriding }] = useOverrideEntryMutation();
  const [resetOverride, { isLoading: isResetting }] = useResetOverrideMutation();

  const [isResetOpen, setIsResetOpen] = React.useState(false);
  const [isOverrideOpen, setIsOverrideOpen] = React.useState(false);

  const refreshDocument = () => {
    clearEntryStateCache();
    clearInheritanceCache();
    // The 'Document' tag types are added at runtime by the Content Manager on
    // the shared slice and are not re-exported, hence the cast (same reason as
    // MoveToSpaceActions).
    dispatch(
      adminApi.util.invalidateTags([
        { type: 'Document', id: `${model}_${documentId}` },
        { type: 'Document', id: `${model}_LIST` },
        'CountDocuments',
      ] as unknown as Parameters<typeof adminApi.util.invalidateTags>[0])
    );
  };

  const run = async (
    action: typeof overrideEntry,
    success: { id: string; defaultMessage: string },
    close: () => void
  ) => {
    try {
      await action({ uid: model, documentId }).unwrap();
      close();
      refreshDocument();

      /**
       * The one place this plugin reloads a page on purpose.
       *
       * Whether the form is editable is decided by the RBAC middleware, and
       * `useRBAC` runs its chain once per mount — it re-checks when the *list of
       * permissions being asked about* changes, never when the answer would. So
       * after taking or dropping a copy the inputs would keep the lock they were
       * rendered with: a form that says read-only about an entry this workspace
       * now owns, or the reverse. Nothing short of remounting the edit view
       * fixes that, and this is a deliberate, once-in-a-while action on a page
       * whose every permission has just changed.
       */
      window.location.reload();
      toggleNotification({ type: 'success', message: formatMessage(success) });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(err as Parameters<typeof formatAPIError>[0]),
      });
    }
  };

  if (state.isOverride) {
    return (
      <Flex direction="column" alignItems="stretch" gap={3}>
        <Flex direction="column" alignItems="flex-start" gap={1}>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('panel.override.own'),
              defaultMessage: 'This workspace has its own version of this entry.',
            })}
          </Typography>
          <WorkspaceChip space={state.space} />
        </Flex>
        <Dialog.Root open={isResetOpen} onOpenChange={setIsResetOpen}>
          <Dialog.Trigger>
            <Button variant="tertiary" startIcon={<ArrowRight />} fullWidth>
              {formatMessage({
                id: getTranslation('panel.override.reset'),
                defaultMessage: 'Reset to the original',
              })}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              {formatMessage({
                id: getTranslation('panel.override.reset.title'),
                defaultMessage: 'Reset to the original',
              })}
            </Dialog.Header>
            <Dialog.Body>
              <Typography>
                {formatMessage({
                  id: getTranslation('panel.override.reset.body'),
                  defaultMessage:
                    'This workspace’s version is deleted and the entry follows the Default workspace again. Anything edited here is lost.',
                })}
              </Typography>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">
                  {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
                </Button>
              </Dialog.Cancel>
              <Button
                variant="danger-light"
                loading={isResetting}
                onClick={() =>
                  run(
                    resetOverride,
                    {
                      id: getTranslation('panel.override.reset.success'),
                      defaultMessage: 'This entry follows the Default workspace again.',
                    },
                    () => setIsResetOpen(false)
                  )
                }
              >
                {formatMessage({
                  id: getTranslation('panel.override.reset.confirm'),
                  defaultMessage: 'Reset',
                })}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
    );
  }

  if (state.editable) {
    return (
      <Flex direction="column" alignItems="flex-start" gap={1}>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage({
            id: getTranslation('panel.belongsTo'),
            defaultMessage: 'This entry belongs to',
          })}
        </Typography>
        <WorkspaceChip space={state.space} />
      </Flex>
    );
  }

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Flex gap={2} alignItems="flex-start">
        <Lock fill="neutral500" />
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(LOCK_MESSAGES[state.reason ?? 'shared-entry'])}
        </Typography>
      </Flex>

      {state.canOverride ? (
        <Dialog.Root open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
          <Dialog.Trigger>
            <Button variant="secondary" startIcon={<Duplicate />} fullWidth>
              {formatMessage({
                id: getTranslation('panel.override.action'),
                defaultMessage: 'Override in this workspace',
              })}
            </Button>
          </Dialog.Trigger>
          <Dialog.Content>
            <Dialog.Header>
              {formatMessage({
                id: getTranslation('panel.override.title'),
                defaultMessage: 'Override this entry',
              })}
            </Dialog.Header>
            <Dialog.Body>
              <Typography>
                {formatMessage({
                  id: getTranslation('panel.override.body'),
                  defaultMessage:
                    'This workspace gets its own copy of the entry, which you can edit here. It keeps the same entry — readers of this workspace see your version — and stops following changes made in the Default workspace.',
                })}
              </Typography>
            </Dialog.Body>
            <Dialog.Footer>
              <Dialog.Cancel>
                <Button variant="tertiary">
                  {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
                </Button>
              </Dialog.Cancel>
              <Button
                loading={isOverriding}
                onClick={() =>
                  run(
                    overrideEntry,
                    {
                      id: getTranslation('panel.override.success'),
                      defaultMessage: 'This workspace now has its own version of this entry.',
                    },
                    () => setIsOverrideOpen(false)
                  )
                }
              >
                {formatMessage({
                  id: getTranslation('panel.override.confirm'),
                  defaultMessage: 'Override',
                })}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Root>
      ) : null}
    </Flex>
  );
};

/**
 * "Workspace" side panel of the edit view (`addEditViewSidePanel`). In the
 * default workspace it shows where the entry lives and lets an admin share it
 * or move it; in a sub-workspace it shows the workspace, or why the entry is
 * read-only.
 */
export const WorkspacePanel: PanelComponent = ({ documentId, model }) => {
  const { formatMessage } = useIntl();
  const states = useEntryStates(model, documentId ? [documentId] : []);

  const state = documentId ? states[documentId] : undefined;
  if (!documentId || !state) {
    return null;
  }

  const isDefault = getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG;

  return {
    title: formatMessage({ id: getTranslation('panel.title'), defaultMessage: 'Workspace' }),
    content: isDefault ? (
      <DefaultWorkspacePanelContent model={model} documentId={documentId} state={state} />
    ) : (
      <SubWorkspacePanelContent model={model} documentId={documentId} state={state} />
    ),
  };
};
