import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogProps,
  Flex,
  ModalBody,
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
  useRBAC,
} from '@strapi/helper-plugin';
import { ExclamationMarkCircle, Trash } from '@strapi/icons';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { AxiosError, AxiosResponse } from 'axios';
import { useIntl } from 'react-intl';
import { useQueryClient } from 'react-query';
import { useParams } from 'react-router-dom';

import { DescriptionComponentRenderer } from '../../../../../components/DescriptionComponentRenderer';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { generatePermissionsObject } from '../../../../utils/permissions';
import { getTranslation } from '../../../../utils/translations';

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
  variant?: 'default' | 'secondary' | 'danger-light' | 'success';
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
  content: React.ReactNode;
  footer: React.ComponentType<{ onClose: () => void }> | React.ReactNode;
  onClose?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * BulkActionsRenderer
 * -----------------------------------------------------------------------------------------------*/

const BulkActionsRenderer = () => {
  const { plugins } = useStrapiApp();
  const { selectedEntries } = useTableContext();

  const { slug, collectionType } = useParams<{
    slug: string;
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
    Pick<Action, 'variant'> {}

const BulkActionConfirmDialog = ({
  onClose,
  onCancel,
  onConfirm,
  title,
  content,
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
      <DialogBody icon={variant === 'danger-light' && <ExclamationMarkCircle />}>
        {content}
      </DialogBody>
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
            variant={variant}
            startIcon={variant === 'danger-light' && <Trash />}
          >
            {formatMessage({
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
  footer: Footer,
  content,
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
      <ModalBody>{content}</ModalBody>
      <Box
        paddingTop={4}
        paddingBottom={4}
        paddingLeft={5}
        paddingRight={5}
        borderWidth="1px 0 0 0"
        borderStyle="solid"
        borderColor="neutral150"
        background="neutral100"
      >
        {typeof Footer === 'function' ? <Footer onClose={handleClose} /> : Footer}
      </Box>
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * useAllowedActions hook
 * -----------------------------------------------------------------------------------------------*/

const useAllowedActions = (slug: string) => {
  const viewPermissions = generatePermissionsObject(slug);
  const permissions = useTypedSelector((state) => state['content-manager_rbacManager'].permissions);
  const { allowedActions } = useRBAC(viewPermissions, permissions ?? []);
  return allowedActions;
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
                    em: (chunks: React.ReactNode) => (
                      <Typography fontWeight="semiBold" textColor="danger500">
                        {chunks}
                      </Typography>
                    ),
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

const DEFAULT_BULK_ACTIONS: BulkActionComponent[] = [DeleteAction];

export { DEFAULT_BULK_ACTIONS, BulkActionsRenderer };
export type { BulkActionDescription };
