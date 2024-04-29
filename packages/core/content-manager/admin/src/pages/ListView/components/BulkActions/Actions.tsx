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
  useQueryParams,
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
  Radio,
} from '@strapi/design-system';
import { Check, ExclamationMarkCircle, Trash } from '@strapi/icons';
import { AxiosError, AxiosResponse } from 'axios';
import { useIntl } from 'react-intl';
import { useQueryClient, useMutation } from 'react-query';

import { Contracts } from '../../../../../../shared';
import { useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { useDoc } from '../../../../hooks/useDocument';
import { useDocumentActions } from '../../../../hooks/useDocumentActions';
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
  const documentIds = selectedRows.map((entry) => entry.documentId);

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

const BULK_DELETE_OPTIONS = {
  SELECTED_LOCALE: 'selected_Locale',
  ALL_LOCALES: 'all_Locales',
};

const DeleteAction: BulkActionComponent = ({ documentIds, model }) => {
  const { formatMessage } = useIntl();
  const { selectRow } = useTable('deleteAction', (state) => state);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const currentLocale = query.plugins?.i18n?.locale || 'en';
  // const { data: locales = [] } = useGetLocalesQuery(); TODO: check if can import this query to get locale name
  const hasDeletePermission = useDocumentRBAC('deleteAction', (state) => state.canDelete);
  const { deleteMany: bulkdeleteAction } = useDocumentActions();
  const [isDeleteAllLocale, setIsDeleteAllLocale] = React.useState(false);

  const handleConfirmBulkDelete = async () => {
    const data = await bulkdeleteAction({
      documentIds,
      model,
      params: {
        locale: isDeleteAllLocale ? '*' : currentLocale,
      },
    });
    if (!('error' in data)) {
      selectRow([]);
    }
  };

  const handleChange: React.FormEventHandler<HTMLDivElement> = (e) => {
    if ('value' in e.target) {
      setIsDeleteAllLocale(e.target.value === BULK_DELETE_OPTIONS.ALL_LOCALES);
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
              defaultMessage: 'What do you want to delete?',
            })}
          </Typography>
          <Box textAlign="center" padding={3}>
            <Flex onChange={handleChange} direction="column" alignItems="flex-start" gap={3}>
              <Radio
                checked={!isDeleteAllLocale}
                value={BULK_DELETE_OPTIONS.SELECTED_LOCALE}
                name="bulk-delete-options"
              >
                {formatMessage(
                  {
                    id: 'popUpWarning.bodyMessage.contentType.delete.selectedLocale',
                    defaultMessage: 'Delete entries ({locale})',
                  },
                  { locale: currentLocale } //TODO: get locale name from locale code
                )}
              </Radio>
              <Radio
                checked={isDeleteAllLocale}
                value={BULK_DELETE_OPTIONS.ALL_LOCALES}
                name="bulk-delete-options"
              >
                {formatMessage({
                  id: 'popUpWarning.bodyMessage.contentType.delete.allLocales',
                  defaultMessage: 'Delete entries (all locales)',
                })}
              </Radio>
            </Flex>
          </Box>
        </Flex>
      ),
      onConfirm: handleConfirmBulkDelete,
    },
  };
};

const UnpublishAction: BulkActionComponent = ({ documentIds, model }) => {
  const { formatMessage } = useIntl();
  const { schema } = useDoc();
  const { selectRow, selectedRows } = useTable('unpublishAction', (state) => state);
  const hasPublishPermission = useDocumentRBAC('unpublishAction', (state) => state.canPublish);
  const hasI18nEnabled = Boolean(schema?.pluginOptions?.i18n);
  const { unpublishMany: bulkUnpublishAction } = useDocumentActions();

  const handleConfirmBulkUnpublish = async () => {
    const data = await bulkUnpublishAction({ documentIds, model });
    if (!('error' in data)) {
      selectRow([]);
    }
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
      onConfirm: handleConfirmBulkUnpublish,
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
