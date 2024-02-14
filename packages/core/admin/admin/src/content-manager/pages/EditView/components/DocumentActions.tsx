import * as React from 'react';

import {
  Box,
  Button,
  Dialog,
  DialogBody,
  DialogFooter,
  DialogProps,
  Flex,
  Icon,
  ModalBody,
  ModalHeader,
  ModalLayout,
  Radio,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { useNotification } from '@strapi/helper-plugin';
import { CrossCircle, ExclamationMarkCircle, More } from '@strapi/icons';
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
  const { formatMessage } = useIntl();
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
        {restActions.length > 0 ? (
          <DocumentActionsMenu
            actions={restActions}
            label={formatMessage({
              id: 'content-manager.containers.edit.panels.default.more-actions',
              defaultMessage: 'More document actions',
            })}
          />
        ) : null}
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
        case 'notification':
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
      {action.dialog?.type === 'dialog' ? (
        <DocumentActionConfirmDialog
          {...action.dialog}
          variant={action.variant}
          isOpen={dialogId === action.id}
          onClose={handleClose}
        />
      ) : null}
      {action.dialog?.type === 'modal' ? (
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
  label?: string;
}

const DocumentActionsMenu = ({ actions, label }: DocumentActionsMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
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
        case 'notification':
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
    setIsOpen(false);
  };

  return (
    <Menu.Root open={isOpen} onOpenChange={setIsOpen}>
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
          {label ||
            formatMessage({
              id: 'content-manager.containers.edit.panels.default.more-actions',
              defaultMessage: 'More document actions',
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
              {action.dialog?.type === 'dialog' ? (
                <DocumentActionConfirmDialog
                  {...action.dialog}
                  variant={action.variant}
                  isOpen={dialogId === action.id}
                  onClose={handleClose}
                />
              ) : null}
              {action.dialog?.type === 'modal' ? (
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
      return 'primary600';
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
        {footer}
      </Box>
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const navigate = useNavigate();
  const { formatMessage } = useIntl();
  const { meta } = useDoc();
  const { canPublish, canCreate, canUpdate } = useDocumentRBAC(
    'PublishAction',
    ({ canPublish, canCreate, canUpdate }) => ({ canPublish, canCreate, canUpdate })
  );
  const { publish } = useDocumentActions();
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);
  const document = useForm('UpdateAction', ({ values }) => values);

  const isDocumentPublished =
    document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
    meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null);

  return {
    /**
     * Disabled when:
     *  - the form is submitting
     *  - the active tab is the published tab
     *  - the document is already published & not modified
     *  - the document is being created & not modified
     *  - the user doesn't have the permission to publish
     *  - the user doesn't have the permission to create a new document
     *  - the user doesn't have the permission to update the document
     */
    disabled:
      isSubmitting ||
      activeTab === 'published' ||
      (!modified && isDocumentPublished) ||
      (!modified && !document.id) ||
      !canPublish ||
      Boolean((!document.id && !canCreate) || (document.id && !canUpdate)),
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      const res = await publish(
        {
          collectionType,
          model,
          id,
        },
        document
      );

      if ('data' in res) {
        if (collectionType !== SINGLE_TYPES) {
          /**
           * TODO: refactor the router so we can just do `../${res.data.id}` instead of this.
           */
          navigate({
            pathname: `../${collectionType}/${model}/${res.data.id}`,
            search: '?status=published',
          });
        } else {
          navigate({
            search: '?status=published',
          });
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
    /**
     * Disabled when:
     * - the form is submitting
     * - the document is not modified
     * - the active tab is the published tab
     * - the user doesn't have the permission to create a new document
     * - the user doesn't have the permission to update the document
     */
    disabled:
      isSubmitting ||
      !modified ||
      activeTab === 'published' ||
      Boolean((!id && !canCreate) || (id && !canUpdate)),
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
            navigate({
              pathname: `../${collectionType}/${model}/${res.data.id}`,
              search: '?state=published',
            });
          }
        }
      } finally {
        setSubmitting(false);
      }
    },
  };
};

UpdateAction.type = 'update';

const UNPUBLISH_DRAFT_OPTIONS = {
  KEEP: 'keep',
  DISCARD: 'discard',
};

const UnpublishAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const { formatMessage } = useIntl();
  const canPublish = useDocumentRBAC('PublishAction', ({ canPublish }) => canPublish);
  const { document, meta } = useDoc();
  const { unpublish } = useDocumentActions();
  const [shouldKeepDraft, setShouldKeepDraft] = React.useState(true);

  const isDocumentModified = document?.status === 'modified';

  const isDocumentPublished =
    document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
    meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null);

  const handleChange: React.FormEventHandler<HTMLFieldSetElement> &
    React.FormEventHandler<HTMLDivElement> = (e) => {
    if ('value' in e.target) {
      setShouldKeepDraft(e.target.value === UNPUBLISH_DRAFT_OPTIONS.KEEP);
    }
  };

  return {
    disabled: !canPublish || activeTab === 'published' || !isDocumentPublished,
    label: formatMessage({
      id: 'app.utils.unpublish',
      defaultMessage: 'Unpublish',
    }),
    icon: <StyledCrossCircle />,
    onClick: async () => {
      if ((!id && collectionType !== SINGLE_TYPES) || isDocumentModified) {
        if (!id) {
          // This should never, ever, happen.
          throw new Error(
            "You're trying to unpublish a document without an id, this is likely a bug with Strapi. Please open an issue."
          );
        }
        return;
      }

      await unpublish({
        collectionType,
        model,
        id,
      });
    },
    dialog: isDocumentModified
      ? {
          type: 'dialog',
          title: formatMessage({
            id: 'app.components.ConfirmDialog.title',
            defaultMessage: 'Confirmation',
          }),
          content: (
            <Flex alignItems="flex-start" direction="column" gap={6}>
              <Flex width="100%" direction="column" gap={2}>
                <Icon as={ExclamationMarkCircle} width="24px" height="24px" color="danger600" />
                <Typography as="p" variant="omega" textAlign="center">
                  {formatMessage({
                    id: 'content-manager.actions.unpublish.dialog.body',
                    defaultMessage: 'Are you sure?',
                  })}
                </Typography>
              </Flex>
              <Flex
                onChange={handleChange}
                direction="column"
                alignItems="flex-start"
                as="fieldset"
                gap={3}
              >
                <VisuallyHidden as="legend"></VisuallyHidden>
                <Radio
                  checked={shouldKeepDraft}
                  value={UNPUBLISH_DRAFT_OPTIONS.KEEP}
                  name="discard-options"
                >
                  {formatMessage({
                    id: 'content-manager.actions.unpublish.dialog.option.keep-draft',
                    defaultMessage: 'Keep draft',
                  })}
                </Radio>
                <Radio
                  checked={!shouldKeepDraft}
                  value={UNPUBLISH_DRAFT_OPTIONS.DISCARD}
                  name="discard-options"
                >
                  {formatMessage({
                    id: 'content-manager.actions.unpublish.dialog.option.replace-draft',
                    defaultMessage: 'Replace draft',
                  })}
                </Radio>
              </Flex>
            </Flex>
          ),
          onConfirm: async () => {
            if (!id && collectionType !== SINGLE_TYPES) {
              // This should never, ever, happen.
              throw new Error(
                "You're trying to unpublish a document without an id, this is likely a bug with Strapi. Please open an issue."
              );
            }

            await unpublish(
              {
                collectionType,
                model,
                id,
              },
              !shouldKeepDraft
            );
          },
        }
      : undefined,
    variant: 'danger',
  };
};

UnpublishAction.type = 'unpublish';

const DiscardAction: DocumentActionComponent = ({ activeTab, id, model, collectionType }) => {
  const { formatMessage } = useIntl();
  const canUpdate = useDocumentRBAC('PublishAction', ({ canUpdate }) => canUpdate);
  const { document } = useDoc();
  const { discard } = useDocumentActions();

  return {
    disabled: !canUpdate || activeTab === 'published' || document?.status !== 'modified',
    label: formatMessage({
      id: 'content-manager.actions.discard.label',
      defaultMessage: 'Discard changes',
    }),
    icon: <StyledCrossCircle />,
    variant: 'danger',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <Icon as={ExclamationMarkCircle} width="24px" height="24px" color="danger600" />
          <Typography as="p" variant="omega" textAlign="center">
            {formatMessage({
              id: 'content-manager.actions.discard.dialog.body',
              defaultMessage: 'Are you sure?',
            })}
          </Typography>
        </Flex>
      ),
      onConfirm: async () => {
        await discard({
          collectionType,
          model,
          id,
        });
      },
    },
  };
};

DiscardAction.type = 'discard';

/**
 * Because the icon system is completely broken, we have to do
 * this to remove the fill from the cog.
 */
const StyledCrossCircle = styled(CrossCircle)`
  path {
    fill: currentColor;
  }
`;

const DEFAULT_ACTIONS = [PublishAction, UpdateAction, UnpublishAction, DiscardAction];

export { DocumentActions, DocumentActionsMenu, DEFAULT_ACTIONS };
export type { DocumentActionDescription, DialogOptions, NotificationOptions, ModalOptions };
