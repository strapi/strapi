import * as React from 'react';

import {
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogProps,
  Flex,
  VisuallyHidden,
} from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useNotification } from '@strapi/helper-plugin';
import { More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { DefaultTheme } from 'styled-components';

import { DocumentActionComponent } from '../../../../core/apis/content-manager';
import { useForm } from '../../../components/Form';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDocumentActions } from '../../../hooks/useDocumentActions';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionDescription {
  label: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  icon?: React.ReactNode;
  /**
   * @default false
   */
  disabled?: boolean;
  /**
   * @default 'panel'
   * @description Where the action should be rendered.
   */
  position?: 'panel' | 'header';
  dialog?: DialogOptions | NotificationOptions | ModalOptions;
  /**
   * @default 'secondary'
   */
  variant?: 'default' | 'secondary' | 'danger' | 'success';
}

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface NotificationOptions {
  type: 'notifcation';
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
  footer: React.ReactNode;
  onClose?: () => void;
}

/* -------------------------------------------------------------------------------------------------
 * DocumentActions
 * -----------------------------------------------------------------------------------------------*/

interface Action extends DocumentActionDescription {
  id: string;
}

interface DocumentActionsProps {
  actions: Action[];
}

const DocumentActions = ({ actions }: DocumentActionsProps) => {
  const [primaryAction, secondaryAction, ...restActions] = actions.filter(
    (action) => action.position !== 'header'
  );

  if (!primaryAction) {
    return null;
  }

  return (
    <Flex direction="column" gap={2} alignItems="stretch" width="100%">
      <Flex gap={2}>
        <Button
          flex={1}
          startIcon={primaryAction.icon}
          disabled={primaryAction.disabled}
          onClick={primaryAction.onClick}
          justifyContent="center"
          variant={primaryAction.variant || 'default'}
        >
          {primaryAction.label}
        </Button>
        {restActions.length > 0 ? <DocumentActionsMenu actions={restActions} /> : null}
      </Flex>
      {secondaryAction ? (
        <Button
          startIcon={secondaryAction.icon}
          disabled={secondaryAction.disabled}
          onClick={secondaryAction.onClick}
          justifyContent="center"
          variant={secondaryAction.variant || 'secondary'}
        >
          {secondaryAction.label}
        </Button>
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionMenu
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionsMenuProps {
  actions: Action[];
}

const DocumentActionsMenu = ({ actions }: DocumentActionsMenuProps) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const isDisabled = actions.every((action) => action.disabled);

  const handleClick =
    (action: Action): React.MouseEventHandler<HTMLButtonElement> =>
    (e) => {
      if (action.onClick) {
        action.onClick(e);
      }

      if (action.dialog) {
        switch (action.dialog.type) {
          case 'notifcation':
            toggleNotification({
              title: action.dialog.title,
              message: action.dialog.content,
              type: action.dialog.status,
              timeout: action.dialog.timeout,
              onClose: action.dialog.onClose,
            });
            break;
          case 'dialog':
            e.preventDefault();
            setDialogId(action.id);
        }
      }
    };

  const handleClose = () => {
    setDialogId(null);
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        disabled={isDisabled}
        size="S"
        endIcon={null}
        paddingTop="7px"
        paddingLeft="9px"
        paddingRight="9px"
        variant="tertiary"
      >
        <More aria-hidden focusable={false} />
        <VisuallyHidden as="span">
          {formatMessage({
            id: 'content-manager.containers.edit.panels.default.more-actions',
            defaultMessage: 'More actions',
          })}
        </VisuallyHidden>
      </Menu.Trigger>
      <Menu.Content popoverPlacement="bottom-end">
        {actions.map((action) => {
          return (
            <React.Fragment key={action.id}>
              <Menu.Item disabled={action.disabled} onClick={handleClick(action)}>
                <Flex color={convertActionVariantToColor(action.variant)} gap={2} as="span">
                  {action.icon}
                  {action.label}
                </Flex>
              </Menu.Item>
              {action.dialog && action.dialog.type === 'dialog' ? (
                <DocumentActionConfirmDialog
                  {...action.dialog}
                  variant={action.variant}
                  isOpen={dialogId === action.id}
                  onClose={handleClose}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </Menu.Content>
    </Menu.Root>
  );
};

const convertActionVariantToColor = (
  variant: DocumentActionDescription['variant'] = 'secondary'
): keyof DefaultTheme['colors'] | undefined => {
  switch (variant) {
    case 'danger':
      return 'danger600';
    case 'secondary':
      return undefined;
    case 'success':
      return 'success600';
    default:
      return 'primary600' as const;
  }
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionConfirmDialog
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionConfirmDialogProps
  extends DialogOptions,
    Pick<DialogProps, 'onClose' | 'isOpen'>,
    Pick<Action, 'variant'> {}

const DocumentActionConfirmDialog = ({
  onClose,
  onCancel,
  onConfirm,
  title,
  content,
  isOpen,
  variant = 'secondary',
}: DocumentActionConfirmDialogProps) => {
  const { formatMessage } = useIntl();

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }

    onClose();
  };

  return (
    <Dialog isOpen={isOpen} title={title} onClose={handleClose}>
      <DialogBody>{content}</DialogBody>
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
          <Button onClick={onConfirm} variant={variant}>
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
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const canPublish = useDocumentRBAC('PublishAction', (state) => state.canPublish);
  const { publish } = useDocumentActions();
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);

  return {
    disabled: !canPublish || isSubmitting || activeTab === 'published' || modified,
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      if (id) {
        const res = await publish({
          collectionType,
          model,
          id,
        });

        if ('data' in res) {
          navigate({ search: `?status=published` });
        }
      }
    },
  };
};

PublishAction.type = 'publish';

const UpdateAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { canCreate, canUpdate } = useDocumentRBAC('PublishAction', ({ canCreate, canUpdate }) => ({
    canCreate,
    canUpdate,
  }));
  const { create, update } = useDocumentActions();

  const isSubmitting = useForm('UpdateAction', ({ isSubmitting }) => isSubmitting);
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const setSubmitting = useForm('UpdateAction', ({ setSubmitting }) => setSubmitting);
  const document = useForm('UpdateAction', ({ values }) => values);

  return {
    disabled:
      Boolean((!id && !canCreate) || (id && !canUpdate)) ||
      isSubmitting ||
      !modified ||
      activeTab === 'published',
    label: formatMessage({
      id: 'content-manager.containers.Edit.save',
      defaultMessage: 'Save',
    }),
    onClick: async () => {
      setSubmitting(true);
      try {
        if (id) {
          await update(
            {
              collectionType,
              model,
              id,
            },
            {
              id,
              ...document,
            }
          );
        } else {
          const res = await create(
            {
              model,
            },
            document
          );

          if ('data' in res) {
            /**
             * TODO: refactor the router so we can just do `../${res.data.id}` instead of this.
             */
            navigate(`../${collectionType}/${model}/${res.data.id}`);
          }
        }
      } finally {
        setSubmitting(false);
      }
    },
  };
};

UpdateAction.type = 'update';

const DEFAULT_ACTIONS = [PublishAction, UpdateAction];

export { DocumentActions, DocumentActionsMenu, DEFAULT_ACTIONS };
export type { DocumentActionDescription, DialogOptions, NotificationOptions, ModalOptions };
