import * as React from 'react';

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
import {
  useStrapiApp,
  useNotification,
  useTableContext,
  useFetchClient,
  useAPIErrorHandler,
  useTracking,
} from '@strapi/helper-plugin';
import { Check, ExclamationMarkCircle, Trash } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { Common } from '@strapi/types';
import { AxiosError, AxiosResponse } from 'axios';
import { useIntl } from 'react-intl';
import { useQueryClient, useMutation } from 'react-query';
import { useParams } from 'react-router-dom';

import { DescriptionComponentRenderer } from '../../../../../components/DescriptionComponentRenderer';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { getTranslation } from '../../../../utils/translations';
import { useAllowedActions } from '../../hooks/useAllowedActions';

import { PublishAction } from './PublishAction';

import type {
  BulkActionComponent,
  ContentManagerPlugin,
} from '../../../../../core/apis/content-manager';

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
  status?: 'info' | 'warning' | 'softWarning' | 'success';
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
  const { plugins } = useStrapiApp();
  const { selectedEntries } = useTableContext();

  const { slug, collectionType } = useParams<{
    slug: Common.UID.ContentType;
    collectionType: string;
  }>();

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={{
          model: slug,
          collectionType,
          ids: selectedEntries,
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
  const toggleNotification = useNotification();
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

const DeleteAction: BulkActionComponent = ({ ids, model: slug }) => {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const contentType = useTypedSelector((state) => state['content-manager_listView'].contentType);
  const { setSelectedEntries } = useTableContext();

  const hasI18nEnabled = Boolean(contentType?.pluginOptions?.i18n);
  const queryClient = useQueryClient();
  const { trackUsage } = useTracking();
  const hasDeletePermission = useAllowedActions(slug).canDelete;

  const handleConfirmDeleteAllData = async () => {
    try {
      await post<
        Contracts.CollectionTypes.BulkDelete.Response,
        AxiosResponse<Contracts.CollectionTypes.BulkDelete.Response>,
        Contracts.CollectionTypes.BulkDelete.Request['body']
      >(`/content-manager/collection-types/${slug}/actions/bulkDelete`, {
        ids,
      });

      queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
      setSelectedEntries([]);
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

const UnpublishAction: BulkActionComponent = ({ ids, model: slug }) => {
  const { formatMessage } = useIntl();
  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler(getTranslation);
  const { selectedEntries, setSelectedEntries } = useTableContext();
  const { data, contentType } = useTypedSelector((state) => state['content-manager_listView']);
  const selectedEntriesObjects = data.filter((entry) => selectedEntries.includes(entry.id));

  const hasI18nEnabled = Boolean(contentType?.pluginOptions?.i18n);
  const queryClient = useQueryClient();
  const hasPublishPermission = useAllowedActions(slug).canPublish;

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
          message: {
            id: 'content-manager.success.record.unpublish',
            defaultMessage: 'Unpublished',
          },
        });

        queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
        setSelectedEntries([]);
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
    await bulkUnpublishMutation.mutateAsync({ ids });
  };

  const showUnpublishButton =
    hasPublishPermission && selectedEntriesObjects.some((entry) => entry.publishedAt);

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

const Emphasis = (chunks: React.ReactNode) => (
  <Typography fontWeight="semiBold" textColor="danger500">
    {chunks}
  </Typography>
);

const DEFAULT_BULK_ACTIONS: BulkActionComponent[] = [PublishAction, UnpublishAction, DeleteAction];

export { DEFAULT_BULK_ACTIONS, BulkActionsRenderer, Emphasis };
export type { BulkActionDescription };
