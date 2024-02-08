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
  VisuallyHidden,
} from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useNotification } from '@strapi/helper-plugin';
import { CrossCircle, More } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import styled, { DefaultTheme } from 'styled-components';

import { DocumentActionComponent } from '../../../../core/apis/content-manager';
import { useForm } from '../../../components/Form';
import { PUBLISHED_AT_ATTRIBUTE_NAME } from '../../../constants/attributes';
import { SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionDescription {
  label: string;
  onClick?: (event: React.SyntheticEvent) => void;
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
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void | Promise<void>;
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
        <DocumentActionButton {...primaryAction} variant={primaryAction.variant || 'default'} />
        {restActions.length > 0 ? <DocumentActionsMenu actions={restActions} /> : null}
      </Flex>
      {secondaryAction ? (
        <DocumentActionButton
          {...secondaryAction}
          variant={secondaryAction.variant || 'secondary'}
        />
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionButton
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionButtonProps extends Action {}

const DocumentActionButton = (action: DocumentActionButtonProps) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const toggleNotification = useNotification();

  const handleClick = (action: Action) => (e: React.MouseEvent) => {
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
        case 'modal':
          e.preventDefault();
          setDialogId(action.id);
      }
    }
  };

  const handleClose = () => {
    setDialogId(null);
  };

  return (
    <>
      <Button
        flex={1}
        startIcon={action.icon}
        disabled={action.disabled}
        onClick={handleClick(action)}
        justifyContent="center"
        variant={action.variant || 'default'}
      >
        {action.label}
      </Button>
      {action.dialog && action.dialog.type === 'dialog' ? (
        <DocumentActionConfirmDialog
          {...action.dialog}
          variant={action.variant}
          isOpen={dialogId === action.id}
          onClose={handleClose}
        />
      ) : null}
      {action.dialog && action.dialog.type === 'modal' ? (
        <DocumentActionModal
          {...action.dialog}
          onModalClose={handleClose}
          isOpen={dialogId === action.id}
        />
      ) : null}
    </>
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
  const isDisabled = actions.every((action) => action.disabled) || actions.length === 0;

  const handleClick = (action: Action) => (e: React.SyntheticEvent) => {
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
        case 'modal':
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
              {/* @ts-expect-error – TODO: this is an error in the DS where it is most likely a synthetic event, not regular. */}
              <Menu.Item disabled={action.disabled} onSelect={handleClick(action)}>
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
              {action.dialog && action.dialog.type === 'modal' ? (
                <DocumentActionModal
                  {...action.dialog}
                  onModalClose={handleClose}
                  isOpen={dialogId === action.id}
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
          <Button onClick={handleConfirm} variant={variant}>
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
 * DocumentActionModal
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionModalProps extends ModalOptions {
  onModalClose: () => void;
  isOpen?: boolean;
}

const DocumentActionModal = ({
  isOpen,
  title,
  onClose,
  footer,
  content,
  onModalClose,
}: DocumentActionModalProps) => {
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
    <ModalLayout onClose={handleClose} labelledBy={id}>
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id={id}>
          {title}
        </Typography>
      </ModalHeader>
      <ModalBody>{content}</ModalBody>
      <ModalFooter
        paddingTop={4}
        paddingBottom={4}
        paddingLeft={5}
        paddingRight={5}
        background="neutral100"
      >
        {footer}
      </ModalFooter>
    </ModalLayout>
  );
};

/**
 * The actual ModalFooter is too strict. It requires a startAction and an endAction. This is not
 * always the case. This is a more flexible version of the ModalFooter. We should remove this
 * when we release the DS@2.
 */
const ModalFooter = styled(Box)`
  border-radius: 0 0 ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

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
    disabled:
      !canPublish ||
      isSubmitting ||
      activeTab === 'published' ||
      modified ||
      (!id && collectionType !== SINGLE_TYPES),
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      if (id || collectionType === SINGLE_TYPES) {
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
        if (id || collectionType === SINGLE_TYPES) {
          await update(
            {
              collectionType,
              model,
              id,
            },
            document
          );
        } else {
          const res = await create(
            {
              model,
            },
            document
          );

          if ('data' in res && collectionType !== SINGLE_TYPES) {
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

const UnpublishAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const { formatMessage } = useIntl();
  const canPublish = useDocumentRBAC('PublishAction', ({ canPublish }) => canPublish);
  const { document, meta } = useDoc();
  const { unpublish } = useDocumentActions();

  const isDocumentPublished =
    document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
    meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null);

  return {
    disabled: !canPublish || activeTab === 'published' || !isDocumentPublished,
    label: formatMessage({
      id: 'app.utils.unpublish',
      defaultMessage: 'Unpublish',
    }),
    icon: <StyledCrossCircle />,
    onClick: async () => {
      if (!id) {
        return;
      }

      await unpublish({
        collectionType,
        model,
        id,
      });
    },
    variant: 'danger',
  };
};

UnpublishAction.type = 'unpublish';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledCrossCircle = styled(CrossCircle)`
  path {
    fill: currentColor;
  }
`;

const DEFAULT_ACTIONS = [PublishAction, UpdateAction, UnpublishAction];

export { DocumentActions, DocumentActionsMenu, DEFAULT_ACTIONS };
export type { DocumentActionDescription, DialogOptions, NotificationOptions, ModalOptions };
