import * as React from 'react';

import {
  useTracking,
  useStrapiApp,
  useNotification,
  NotificationConfig,
  DescriptionComponentRenderer,
  useTable,
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
} from '@strapi/design-system';
import { Check, WarningCircle, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { useDoc } from '../../../../hooks/useDocument';
import { useDocumentActions } from '../../../../hooks/useDocumentActions';
import { buildValidParams } from '../../../../utils/api';
import { getTranslation } from '../../../../utils/translations';

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

  return (
    <Flex gap={2}>
      <DescriptionComponentRenderer
        props={{
          model,
          collectionType,
          documents: selectedRows,
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

interface Action extends BulkActionDescription {
  id: string;
}

const BulkActionAction = (action: Action) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const { toggleNotification } = useNotification();

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
      <DialogBody icon={<WarningCircle />}>{content}</DialogBody>
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
        <Typography fontWeight="bold" textColor="neutral800" tag="h2" id={id}>
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

const DeleteAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  const { schema: contentType } = useDoc();
  const selectRow = useTable('DeleteAction', (state) => state.selectRow);
  const hasI18nEnabled = Boolean(contentType?.pluginOptions?.i18n);
  const [{ query }] = useQueryParams<{ plugins?: { i18n?: { locale?: string } } }>();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const hasDeletePermission = useDocumentRBAC('deleteAction', (state) => state.canDelete);
  const { deleteMany: bulkDeleteAction } = useDocumentActions();
  const documentIds = documents.map(({ documentId }) => documentId);

  const handleConfirmBulkDelete = async () => {
    const res = await bulkDeleteAction({
      documentIds,
      model,
      params,
    });
    if (!('error' in res)) {
      selectRow([]);
    }
  };

  if (!hasDeletePermission) return null;

  return {
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
      onConfirm: handleConfirmBulkDelete,
    },
  };
};

DeleteAction.type = 'delete';

const UnpublishAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  const { schema } = useDoc();
  const selectRow = useTable('UnpublishAction', (state) => state.selectRow);
  const hasPublishPermission = useDocumentRBAC('unpublishAction', (state) => state.canPublish);
  const hasI18nEnabled = Boolean(schema?.pluginOptions?.i18n);
  const hasDraftAndPublishEnabled = Boolean(schema?.options?.draftAndPublish);
  const { unpublishMany: bulkUnpublishAction } = useDocumentActions();
  const documentIds = documents.map(({ documentId }) => documentId);
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  const handleConfirmBulkUnpublish = async () => {
    const data = await bulkUnpublishAction({ documentIds, model, params });
    if (!('error' in data)) {
      selectRow([]);
    }
  };

  const showUnpublishButton =
    hasDraftAndPublishEnabled &&
    hasPublishPermission &&
    documents.some((entry) => entry.status === 'published');

  if (!showUnpublishButton) return null;

  return {
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

UnpublishAction.type = 'unpublish';

const Emphasis = (chunks: React.ReactNode) => (
  <Typography fontWeight="semiBold" textColor="danger500">
    {chunks}
  </Typography>
);

const DEFAULT_BULK_ACTIONS: BulkActionComponent[] = [UnpublishAction, DeleteAction];

export { DEFAULT_BULK_ACTIONS, BulkActionsRenderer, Emphasis };
export type { BulkActionDescription };
