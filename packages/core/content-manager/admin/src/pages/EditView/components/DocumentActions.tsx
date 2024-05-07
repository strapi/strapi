import * as React from 'react';

import {
  useForm,
  useNotification,
  NotificationConfig,
  useAPIErrorHandler,
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
  ModalBody,
  ModalHeader,
  ModalLayout,
  Radio,
  Typography,
  VisuallyHidden,
  Menu,
} from '@strapi/design-system';
import { CrossCircle, More, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';
import { styled, DefaultTheme } from 'styled-components';

import { PUBLISHED_AT_ATTRIBUTE_NAME } from '../../../constants/attributes';
import { SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { CLONE_PATH } from '../../../router';
import { isBaseQueryError, buildValidParams } from '../../../utils/api';

import type { DocumentActionComponent } from '../../../content-manager';

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/
type DocumentActionPosition = 'panel' | 'header' | 'table-row';

interface DocumentActionDescription {
  label: string;
  onClick?: (event: React.SyntheticEvent) => Promise<boolean | void> | boolean | void;
  icon?: React.ReactNode;
  /**
   * @default false
   */
  disabled?: boolean;
  /**
   * @default 'panel'
   * @description Where the action should be rendered.
   */
  position?: DocumentActionPosition | DocumentActionPosition[];
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
  status?: NotificationConfig['type'];
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
  const [primaryAction, secondaryAction, ...restActions] = actions.filter((action) => {
    if (action.position === undefined) {
      return true;
    }

    const positions = Array.isArray(action.position) ? action.position : [action.position];
    return positions.includes('panel');
  });

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
  const { toggleNotification } = useNotification();

  const handleClick = (action: Action) => async (e: React.MouseEvent) => {
    const { onClick = () => false, dialog, id } = action;

    const muteDialog = await onClick(e);

    if (dialog && !muteDialog) {
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
        case 'modal':
          e.preventDefault();
          setDialogId(id);
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
  children?: React.ReactNode;
  label?: string;
  variant?: 'ghost' | 'tertiary';
}

const DocumentActionsMenu = ({
  actions,
  children,
  label,
  variant = 'tertiary',
}: DocumentActionsMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const isDisabled = actions.every((action) => action.disabled) || actions.length === 0;

  const handleClick = (action: Action) => async (e: React.SyntheticEvent) => {
    const { onClick = () => false, dialog, id } = action;

    const muteDialog = await onClick(e);

    if (dialog && !muteDialog) {
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
        case 'modal':
          setDialogId(id);
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
        variant={variant}
      >
        <More aria-hidden focusable={false} />
        <VisuallyHidden tag="span">
          {label ||
            formatMessage({
              id: 'content-manager.containers.edit.panels.default.more-actions',
              defaultMessage: 'More document actions',
            })}
        </VisuallyHidden>
      </Menu.Trigger>
      <Menu.Content top="4px" maxHeight={undefined} popoverPlacement="bottom-end">
        {actions.map((action) => {
          return (
            <Menu.Item
              disabled={action.disabled}
              /* @ts-expect-error – TODO: this is an error in the DS where it is most likely a synthetic event, not regular. */
              onSelect={handleClick(action)}
              display="block"
              key={action.id}
            >
              <Flex justifyContent="space-between" gap={4}>
                <Flex color={convertActionVariantToColor(action.variant)} gap={2} tag="span">
                  {action.icon}
                  {action.label}
                </Flex>
                {/* TODO: remove this in 5.1 release */}
                {action.id.startsWith('HistoryAction') && (
                  <Flex
                    alignItems="center"
                    background="alternative100"
                    borderStyle="solid"
                    borderColor="alternative200"
                    borderWidth="1px"
                    height={5}
                    paddingLeft={2}
                    paddingRight={2}
                    hasRadius
                    color="alternative600"
                  >
                    <Typography variant="sigma" fontWeight="bold" lineHeight={1}>
                      {formatMessage({ id: 'global.new', defaultMessage: 'New' })}
                    </Typography>
                  </Flex>
                )}
              </Flex>
            </Menu.Item>
          );
        })}
        {children}
      </Menu.Content>
      {actions.map((action) => {
        return (
          <React.Fragment key={action.id}>
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
  footer: Footer,
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
        <Typography fontWeight="bold" textColor="neutral800" tag="h2" id={id}>
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
 * DocumentActionComponents
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: DocumentActionComponent = ({
  activeTab,
  documentId,
  model,
  collectionType,
  meta,
  document,
}) => {
  const { schema } = useDoc();
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatValidationErrors: formatValidationErrors } = useAPIErrorHandler();
  const isCloning = useMatch(CLONE_PATH) !== null;
  const { formatMessage } = useIntl();
  const { canPublish, canCreate, canUpdate } = useDocumentRBAC(
    'PublishAction',
    ({ canPublish, canCreate, canUpdate }) => ({ canPublish, canCreate, canUpdate })
  );
  const { publish } = useDocumentActions();
  const [{ query, rawQuery }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const modified = useForm('PublishAction', ({ modified }) => modified);
  const setSubmitting = useForm('PublishAction', ({ setSubmitting }) => setSubmitting);
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);
  const validate = useForm('PublishAction', (state) => state.validate);
  const setErrors = useForm('PublishAction', (state) => state.setErrors);
  const formValues = useForm('PublishAction', ({ values }) => values);

  const isDocumentPublished =
    (document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
      meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null)) &&
    document?.status !== 'modified';

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  return {
    /**
     * Disabled when:
     *  - currently if you're cloning a document we don't support publish & clone at the same time.
     *  - the form is submitting
     *  - the active tab is the published tab
     *  - the document is already published & not modified
     *  - the document is being created & not modified
     *  - the user doesn't have the permission to publish
     *  - the user doesn't have the permission to create a new document
     *  - the user doesn't have the permission to update the document
     */
    disabled:
      isCloning ||
      isSubmitting ||
      activeTab === 'published' ||
      (!modified && isDocumentPublished) ||
      (!modified && !document?.documentId) ||
      !canPublish ||
      Boolean((!document?.documentId && !canCreate) || (document?.documentId && !canUpdate)),
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      setSubmitting(true);

      try {
        const { errors } = await validate();

        if (errors) {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'content-manager.validation.error',
              defaultMessage:
                'There are validation errors in your document. Please fix them before saving.',
            }),
          });

          return;
        }

        const res = await publish(
          {
            collectionType,
            model,
            documentId,
            params,
          },
          formValues
        );

        if ('data' in res && collectionType !== SINGLE_TYPES) {
          /**
           * TODO: refactor the router so we can just do `../${res.data.documentId}` instead of this.
           */
          navigate({
            pathname: `../${collectionType}/${model}/${res.data.documentId}`,
            search: rawQuery,
          });
        } else if (
          'error' in res &&
          isBaseQueryError(res.error) &&
          res.error.name === 'ValidationError'
        ) {
          setErrors(formatValidationErrors(res.error));
        }
      } finally {
        setSubmitting(false);
      }
    },
  };
};

PublishAction.type = 'publish';

const UpdateAction: DocumentActionComponent = ({
  activeTab,
  documentId,
  model,
  collectionType,
}) => {
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatValidationErrors: formatValidationErrors } = useAPIErrorHandler();
  const cloneMatch = useMatch(CLONE_PATH);
  const isCloning = cloneMatch !== null;
  const { formatMessage } = useIntl();
  const { canCreate, canUpdate } = useDocumentRBAC('UpdateAction', ({ canCreate, canUpdate }) => ({
    canCreate,
    canUpdate,
  }));
  const { create, update, clone } = useDocumentActions();
  const [{ query, rawQuery }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  const isSubmitting = useForm('UpdateAction', ({ isSubmitting }) => isSubmitting);
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const setSubmitting = useForm('UpdateAction', ({ setSubmitting }) => setSubmitting);
  const document = useForm('UpdateAction', ({ values }) => values);
  const validate = useForm('UpdateAction', (state) => state.validate);
  const setErrors = useForm('UpdateAction', (state) => state.setErrors);
  const resetForm = useForm('PublishAction', ({ resetForm }) => resetForm);

  return {
    /**
     * Disabled when:
     * - the form is submitting
     * - the document is not modified & we're not cloning (you can save a clone entity straight away)
     * - the active tab is the published tab
     * - the user doesn't have the permission to create a new document
     * - the user doesn't have the permission to update the document
     */
    disabled:
      isSubmitting ||
      (!modified && !isCloning) ||
      activeTab === 'published' ||
      Boolean((!documentId && !canCreate) || (documentId && !canUpdate)),
    label: formatMessage({
      id: 'content-manager.containers.Edit.save',
      defaultMessage: 'Save',
    }),
    onClick: async () => {
      setSubmitting(true);

      try {
        const { errors } = await validate();

        if (errors) {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'content-manager.validation.error',
              defaultMessage:
                'There are validation errors in your document. Please fix them before saving.',
            }),
          });

          return;
        }

        if (isCloning) {
          const res = await clone(
            {
              model,
              documentId: cloneMatch.params.origin!,
              params,
            },
            document
          );

          if ('data' in res) {
            /**
             * TODO: refactor the router so we can just do `../${res.data.documentId}` instead of this.
             */
            navigate({
              pathname: `../${collectionType}/${model}/${res.data.documentId}`,
              search: rawQuery,
            });
          } else if (
            'error' in res &&
            isBaseQueryError(res.error) &&
            res.error.name === 'ValidationError'
          ) {
            setErrors(formatValidationErrors(res.error));
          }
        } else if (documentId || collectionType === SINGLE_TYPES) {
          const res = await update(
            {
              collectionType,
              model,
              documentId,
              params,
            },
            document
          );

          if (
            'error' in res &&
            isBaseQueryError(res.error) &&
            res.error.name === 'ValidationError'
          ) {
            setErrors(formatValidationErrors(res.error));
          } else {
            resetForm();
          }
        } else {
          const res = await create(
            {
              model,
              params,
            },
            document
          );

          if ('data' in res && collectionType !== SINGLE_TYPES) {
            /**
             * TODO: refactor the router so we can just do `../${res.data.documentId}` instead of this.
             */
            navigate({
              pathname: `../${collectionType}/${model}/${res.data.documentId}`,
              search: rawQuery,
            });
          } else if (
            'error' in res &&
            isBaseQueryError(res.error) &&
            res.error.name === 'ValidationError'
          ) {
            setErrors(formatValidationErrors(res.error));
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

const UnpublishAction: DocumentActionComponent = ({
  activeTab,
  documentId,
  model,
  collectionType,
  document,
}) => {
  const { formatMessage } = useIntl();
  const { schema } = useDoc();
  const canPublish = useDocumentRBAC('UnpublishAction', ({ canPublish }) => canPublish);
  const { unpublish } = useDocumentActions();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { toggleNotification } = useNotification();
  const [shouldKeepDraft, setShouldKeepDraft] = React.useState(true);

  const isDocumentModified = document?.status === 'modified';

  const handleChange: React.FormEventHandler<HTMLFieldSetElement> &
    React.FormEventHandler<HTMLDivElement> = (e) => {
    if ('value' in e.target) {
      setShouldKeepDraft(e.target.value === UNPUBLISH_DRAFT_OPTIONS.KEEP);
    }
  };

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  return {
    disabled:
      !canPublish ||
      activeTab === 'published' ||
      (document?.status !== 'published' && document?.status !== 'modified'),
    label: formatMessage({
      id: 'app.utils.unpublish',
      defaultMessage: 'Unpublish',
    }),
    icon: <StyledCrossCircle />,
    onClick: async () => {
      /**
       * return if there's no id & we're in a collection type, or the status modified
       * for either collection type because we use a dialog to handle the process in
       * the latter case.
       */
      if ((!documentId && collectionType !== SINGLE_TYPES) || isDocumentModified) {
        if (!documentId) {
          // This should never, ever, happen.
          console.error(
            "You're trying to unpublish a document without an id, this is likely a bug with Strapi. Please open an issue."
          );

          toggleNotification({
            message: formatMessage({
              id: 'content-manager.actions.unpublish.error',
              defaultMessage: 'An error occurred while trying to unpublish the document.',
            }),
            type: 'danger',
          });
        }

        return;
      }

      await unpublish({
        collectionType,
        model,
        documentId,
        params,
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
                <WarningCircle width="24px" height="24px" fill="danger600" />
                <Typography tag="p" variant="omega" textAlign="center">
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
                tag="fieldset"
                gap={3}
              >
                <VisuallyHidden tag="legend"></VisuallyHidden>
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
            if (!documentId && collectionType !== SINGLE_TYPES) {
              // This should never, ever, happen.
              console.error(
                "You're trying to unpublish a document without an id, this is likely a bug with Strapi. Please open an issue."
              );

              toggleNotification({
                message: formatMessage({
                  id: 'content-manager.actions.unpublish.error',
                  defaultMessage: 'An error occurred while trying to unpublish the document.',
                }),
                type: 'danger',
              });
            }

            await unpublish(
              {
                collectionType,
                model,
                documentId,
                params,
              },
              !shouldKeepDraft
            );
          },
        }
      : undefined,
    variant: 'danger',
    position: ['panel', 'table-row'],
  };
};

UnpublishAction.type = 'unpublish';

const DiscardAction: DocumentActionComponent = ({
  activeTab,
  documentId,
  model,
  collectionType,
  document,
}) => {
  const { formatMessage } = useIntl();
  const { schema } = useDoc();
  const canUpdate = useDocumentRBAC('DiscardAction', ({ canUpdate }) => canUpdate);
  const { discard } = useDocumentActions();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  return {
    disabled: !canUpdate || activeTab === 'published' || document?.status !== 'modified',
    label: formatMessage({
      id: 'content-manager.actions.discard.label',
      defaultMessage: 'Discard changes',
    }),
    icon: <StyledCrossCircle />,
    position: ['panel', 'table-row'],
    variant: 'danger',
    dialog: {
      type: 'dialog',
      title: formatMessage({
        id: 'app.components.ConfirmDialog.title',
        defaultMessage: 'Confirmation',
      }),
      content: (
        <Flex direction="column" gap={2}>
          <WarningCircle width="24px" height="24px" fill="danger600" />
          <Typography tag="p" variant="omega" textAlign="center">
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
          documentId,
          params,
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
