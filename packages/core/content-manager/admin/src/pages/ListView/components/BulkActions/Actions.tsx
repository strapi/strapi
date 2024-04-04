import * as React from 'react';

import {
  useTracking,
  useFetchClient,
  useStrapiApp,
  useNotification,
  NotificationConfig,
  DescriptionComponentRenderer,
  useAPIErrorHandler,
  useTable,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogProps,
  Flex,
  ModalHeader,
  ModalLayout,
  Typography,
} from '@strapi/design-system';
import { Check, ExclamationMarkCircle, Trash } from '@strapi/icons';
import { AxiosError, AxiosResponse } from 'axios';
import { useIntl } from 'react-intl';
import { useQueryClient, useMutation } from 'react-query';

import { Contracts } from '../../../../../../shared';
import { useDoc } from '../../../../hooks/useDocument';
import { getTranslation } from '../../../../utils/translations';

import { PublishAction } from './PublishAction';

import type { BulkActionComponent, ContentManagerPlugin } from '../../../../content-manager';

interface BulkActionDescription {
  dialog?: DialogOptions | NotificationOptions | ModalOptions;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  onClick?: (event: React.SyntheticEvent) => void;
  /**
   * @default 'default'
   */
  type?: 'icon' | 'default';
  /**
   * @default 'secondary'
   */
  variant?: 'default' | 'secondary' | 'tertiary' | 'danger-light' | 'success';
}

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
}

interface NotificationOptions {
  type: 'notification';
  title: string;
  link?: {
    label: string;
    url: string;
    target?: string;
  };
  content?: string;
  onClose?: () => void;
  status?: NotificationConfig['type'];
  timeout?: number;
}

interface ModalOptions {
  type: 'modal';
  title: string;
  content: React.ComponentType<{ onClose: () => void }>;
  onClose?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * BulkActionsRenderer
 * -----------------------------------------------------------------------------------------------*/

const BulkActionsRenderer = () => {
  const plugins = useStrapiApp('BulkActionsRenderer', (state) => state.plugins);

  const { model, collectionType } = useDoc();
  const { selectedRows } = useTable('BulkActionsRenderer', (state) => state);
  const documentIds = selectedRows.map((entry) => entry.id.toString());

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={{
          model,
          collectionType,
          documentIds,
        }}
        descriptions={(
          plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
        ).getBulkActions()}
      >
        {(actions) => actions.map((action) => <BulkActionAction key={action.id} {...action} />)}
      </DescriptionComponentRenderer>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BulkActionAction
 * -----------------------------------------------------------------------------------------------*/

interface Action extends BulkActionDescription, Pick<BulkActionComponent, 'actionType'> {
  id: string;
}

const BulkActionAction = (action: Action) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const { toggleNotification } = useNotification();
  const { trackUsage } = useTracking();

  const handleClick = (action: Action) => (e: React.MouseEvent) => {
    const { onClick, dialog, id } = action;

    if (onClick) {
      onClick(e);
    }

    if (dialog) {
      switch (dialog.type) {
        case 'notification':
          toggleNotification({
            title: dialog.title,
            message: dialog.content,
            type: dialog.status,
            timeout: dialog.timeout,
            onClose: dialog.onClose,
          });
          break;
        case 'dialog':
        case 'modal': {
          if (action.actionType === 'delete') trackUsage('willBulkDeleteEntries');
          e.preventDefault();
          setDialogId(id);
        }
      }
    }
  };

  const handleClose = () => {
    setDialogId(null);
    if (action.dialog?.type === 'modal' && action.dialog?.onClose) {
      action.dialog.onClose();
    }
  };

  return (
    <>
      <Button
        disabled={action.disabled}
        startIcon={action.icon}
        variant={action.variant}
        onClick={handleClick(action)}
      >
        {action.label}
      </Button>
      {action.dialog?.type === 'dialog' ? (
        <BulkActionConfirmDialog
          {...action.dialog}
          variant={action.variant}
          isOpen={dialogId === action.id}
          onClose={handleClose}
        />
      ) : null}
      {action.dialog?.type === 'modal' ? (
        <BulkActionModal
          {...action.dialog}
          onModalClose={handleClose}
          isOpen={dialogId === action.id}
        />
      ) : null}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BulkActionConfirmDialog
 * -----------------------------------------------------------------------------------------------*/

interface BulkActionConfirmDialogProps
  extends DialogOptions,
    Pick<DialogProps, 'onClose' | 'isOpen'>,
    Pick<Action, 'variant'> {
  confirmButton?: string;
}

const BulkActionConfirmDialog = ({
  onClose,
  onCancel,
  onConfirm,
  title,
  content,
  confirmButton,
  isOpen,
  variant = 'secondary',
}: BulkActionConfirmDialogProps) => {
  const { formatMessage } = useIntl();

  const handleClose = async () => {
    if (onCancel) {
      await onCancel();
    }

    onClose();
  };

  const handleConfirm = async () => {
    if (onConfirm) {
      await onConfirm();
    }

    onClose();
  };

  return (
    <Dialog isOpen={isOpen} title={title} onClose={handleClose}>
      <DialogBody icon={<ExclamationMarkCircle />}>{content}</DialogBody>
      <DialogFooter
        startAction={
          <Button onClick={handleClose} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endAction={
          <Button
            onClick={handleConfirm}
            variant={variant === 'danger-light' ? variant : 'secondary'}
            startIcon={variant === 'danger-light' ? <Trash /> : <Check />}
          >
            {confirmButton
              ? confirmButton
              : formatMessage({
                  id: 'app.components.Button.confirm',
                  defaultMessage: 'Confirm',
                })}
          </Button>
        }
      />
    </Dialog>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BulkActionModal
 * -----------------------------------------------------------------------------------------------*/

interface BulkActionModalProps extends ModalOptions {
  onModalClose: () => void;
  isOpen?: boolean;
}

const BulkActionModal = ({
  isOpen,
  title,
  onClose,
  content: Content,
  onModalClose,
}: BulkActionModalProps) => {
  const id = React.useId();

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    if (onClose) {
      onClose();
    }

    onModalClose();
  };

  return (
    <ModalLayout borderRadius="4px" overflow="hidden" onClose={handleClose} labelledBy={id}>
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id={id}>
          {title}
        </Typography>
      </ModalHeader>
      <Content onClose={handleClose} />
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DefaultBulkActions
 * -----------------------------------------------------------------------------------------------*/

const DeleteAction: BulkActionComponent = ({ documentIds, model: slug }) => {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const { selectRow } = useTable('deleteAction', (state) => state);
  const { schema } = useDoc();

  const hasI18nEnabled = Boolean(schema?.pluginOptions?.i18n);
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const contentPermissions = getContentPermissions(slug);
  const {
    allowedActions: { canDelete: hasDeletePermission },
  } = useRBAC(contentPermissions);

  const handleConfirmDeleteAllData = async () => {
    try {
      await post<
        Contracts.CollectionTypes.BulkDelete.Response,
        AxiosResponse<Contracts.CollectionTypes.BulkDelete.Response>,
        Contracts.CollectionTypes.BulkDelete.Request['body']
      >(`/content-manager/collection-types/${slug}/actions/bulkDelete`, {
        documentIds,
      });

      queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
      selectRow([]);
      trackUsage('didBulkDeleteEntries');
    } catch (err) {
      if (err instanceof AxiosError) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(err),
        });
      }
    }
  };

  if (!hasDeletePermission) return null;

  return {
    actionType: 'delete',
    variant: 'danger-light',
    label: formatMessage({ id: 'global.delete', defaultMessage: 'Delete' }),
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: 'popUpWarning.bodyMessage.contentType.delete.all',
              defaultMessage: 'Are you sure you want to delete these entries?',
            })}
          </Typography>
          {hasI18nEnabled && (
            <Box textAlign="center" padding={3}>
              <Typography textColor="danger500">
                {formatMessage(
                  {
                    id: getTranslation('Settings.list.actions.deleteAdditionalInfos'),
                    defaultMessage:
                      'This will delete the active locale versions <em>(from Internationalization)</em>',
                  },
                  {
                    em: Emphasis,
                  }
                )}
              </Typography>
            </Box>
          )}
        </Flex>
      ),
      onConfirm: handleConfirmDeleteAllData,
    },
  };
};

const UnpublishAction: BulkActionComponent = ({ documentIds, model: slug }) => {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const { selectRow, selectedRows } = useTable('unpublishAction', (state) => state);
  const { schema } = useDoc();
  const hasI18nEnabled = Boolean(schema?.pluginOptions?.i18n);
  const contentPermissions = getContentPermissions(slug);
  const {
    allowedActions: { canPublish: hasPublishPermission },
  } = useRBAC(contentPermissions);

  const queryClient = useQueryClient();

  const bulkUnpublishMutation = useMutation<
    Contracts.CollectionTypes.BulkUnpublish.Response,
    AxiosError<Required<Pick<Contracts.CollectionTypes.BulkUnpublish.Response, 'error'>>>,
    Contracts.CollectionTypes.BulkUnpublish.Request['body']
  >(
    async (body) => {
      const { data } = await post<
        Contracts.CollectionTypes.BulkUnpublish.Response,
        AxiosResponse<Contracts.CollectionTypes.BulkUnpublish.Response>,
        Contracts.CollectionTypes.BulkUnpublish.Request['body']
      >(`/content-manager/collection-types/${slug}/actions/bulkUnpublish`, body);

      return data;
    },
    {
      onSuccess() {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'content-manager.success.record.unpublish',
            defaultMessage: 'Unpublished',
          }),
        });

        queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
        selectRow([]);
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const handleConfirmUnpublishAllData = async () => {
    await bulkUnpublishMutation.mutateAsync({ documentIds });
  };

  const showUnpublishButton =
    hasPublishPermission && selectedRows.some((entry) => entry.status === 'published');

  if (!showUnpublishButton) return null;

  return {
    actionType: 'unpublish',
    variant: 'tertiary',
    label: formatMessage({ id: 'app.utils.unpublish', defaultMessage: 'Unpublish' }),
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" alignItems="stretch" gap={2}>
          <Typography id="confirm-description" textAlign="center">
            {formatMessage({
              id: 'popUpWarning.bodyMessage.contentType.unpublish.all',
              defaultMessage: 'Are you sure you want to unpublish these entries?',
            })}
          </Typography>
          {hasI18nEnabled && (
            <Box textAlign="center" padding={3}>
              <Typography textColor="danger500">
                {formatMessage(
                  {
                    id: getTranslation('Settings.list.actions.unpublishAdditionalInfos'),
                    defaultMessage:
                      'This will unpublish the active locale versions <em>(from Internationalization)</em>',
                  },
                  {
                    em: Emphasis,
                  }
                )}
              </Typography>
            </Box>
          )}
        </Flex>
      ),
      confirmButton: formatMessage({
        id: 'app.utils.unpublish',
        defaultMessage: 'Unpublish',
      }),
      onConfirm: handleConfirmUnpublishAllData,
    },
  };
};

export const getContentPermissions = (subject: string) => {
  const permissions = {
    delete: [
      {
        action: 'plugin::content-manager.explorer.delete',
        subject,
        id: '',
        actionParameters: {},
        properties: {},
        conditions: [],
      },
    ],
    publish: [
      {
        action: 'plugin::content-manager.explorer.publish',
        subject,
        id: '',
        actionParameters: {},
        properties: {},
        conditions: [],
      },
    ],
  };

  return permissions;
};

const Emphasis = (chunks: React.ReactNode) => (
  <Typography fontWeight="semiBold" textColor="danger500">
    {chunks}
  </Typography>
);

const DEFAULT_BULK_ACTIONS: BulkActionComponent[] = [PublishAction, UnpublishAction, DeleteAction];

export { DEFAULT_BULK_ACTIONS, BulkActionsRenderer, Emphasis };
export type { BulkActionDescription };
