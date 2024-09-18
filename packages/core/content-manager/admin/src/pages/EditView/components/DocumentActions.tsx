import * as React from 'react';

import {
  useForm,
  useNotification,
  NotificationConfig,
  useAPIErrorHandler,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  Flex,
  Modal,
  Radio,
  Typography,
  VisuallyHidden,
  Menu,
  ButtonProps,
} from '@strapi/design-system';
import { Cross, More, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate } from 'react-router-dom';
import { styled, DefaultTheme } from 'styled-components';

import { PUBLISHED_AT_ATTRIBUTE_NAME } from '../../../constants/attributes';
import { SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { CLONE_PATH, LIST_PATH } from '../../../router';
import { useGetDraftRelationCountQuery } from '../../../services/documents';
import { isBaseQueryError, buildValidParams } from '../../../utils/api';
import { getTranslation } from '../../../utils/translations';

import type { RelationsFormValue } from './FormInputs/Relations';
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
  variant?: ButtonProps['variant'];
}

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  variant?: ButtonProps['variant'];
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
  content: React.ComponentType<{ onClose: () => void }> | React.ReactNode;
  footer?: React.ComponentType<{ onClose: () => void }> | React.ReactNode;
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
        flex="auto"
        startIcon={action.icon}
        disabled={action.disabled}
        onClick={handleClick(action)}
        justifyContent="center"
        variant={action.variant || 'default'}
        paddingTop="7px"
        paddingBottom="7px"
      >
        {action.label}
      </Button>
      {action.dialog?.type === 'dialog' ? (
        <DocumentActionConfirmDialog
          {...action.dialog}
          variant={action.dialog?.variant ?? action.variant}
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
        paddingTop="4px"
        paddingLeft="7px"
        paddingRight="7px"
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
      <Menu.Content maxHeight={undefined} popoverPlacement="bottom-end">
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
                <Flex
                  color={!action.disabled ? convertActionVariantToColor(action.variant) : 'inherit'}
                  gap={2}
                  tag="span"
                >
                  <Flex
                    tag="span"
                    color={
                      !action.disabled ? convertActionVariantToIconColor(action.variant) : 'inherit'
                    }
                  >
                    {action.icon}
                  </Flex>
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

const convertActionVariantToIconColor = (
  variant: DocumentActionDescription['variant'] = 'secondary'
): keyof DefaultTheme['colors'] | undefined => {
  switch (variant) {
    case 'danger':
      return 'danger600';
    case 'secondary':
      return 'neutral500';
    case 'success':
      return 'success600';
    default:
      return 'primary600';
  }
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionConfirmDialog
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionConfirmDialogProps extends DialogOptions, Pick<Action, 'variant'> {
  onClose: () => void;
  isOpen: Dialog.Props['open'];
}

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
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Content>
        <Dialog.Header>{title}</Dialog.Header>
        <Dialog.Body>{content}</Dialog.Body>
        <Dialog.Footer>
          <Dialog.Cancel>
            <Button variant="tertiary" fullWidth>
              {formatMessage({
                id: 'app.components.Button.cancel',
                defaultMessage: 'Cancel',
              })}
            </Button>
          </Dialog.Cancel>
          <Button onClick={handleConfirm} variant={variant} fullWidth>
            {formatMessage({
              id: 'app.components.Button.confirm',
              defaultMessage: 'Confirm',
            })}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog.Root>
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
  content: Content,
  onModalClose,
}: DocumentActionModalProps) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }

    onModalClose();
  };

  return (
    <Modal.Root open={isOpen} onOpenChange={handleClose}>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        {typeof Content === 'function' ? (
          <Content onClose={handleClose} />
        ) : (
          <Modal.Body>{Content}</Modal.Body>
        )}
        {typeof Footer === 'function' ? <Footer onClose={handleClose} /> : Footer}
      </Modal.Content>
    </Modal.Root>
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
  const isListView = useMatch(LIST_PATH) !== null;
  const isCloning = useMatch(CLONE_PATH) !== null;
  const { formatMessage } = useIntl();
  const canPublish = useDocumentRBAC('PublishAction', ({ canPublish }) => canPublish);
  const { publish } = useDocumentActions();
  const [
    countDraftRelations,
    { isLoading: isLoadingDraftRelations, isError: isErrorDraftRelations },
  ] = useGetDraftRelationCountQuery();
  const [localCountOfDraftRelations, setLocalCountOfDraftRelations] = React.useState(0);
  const [serverCountOfDraftRelations, setServerCountOfDraftRelations] = React.useState(0);

  const [{ query, rawQuery }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  const modified = useForm('PublishAction', ({ modified }) => modified);
  const setSubmitting = useForm('PublishAction', ({ setSubmitting }) => setSubmitting);
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);
  const validate = useForm('PublishAction', (state) => state.validate);
  const setErrors = useForm('PublishAction', (state) => state.setErrors);
  const formValues = useForm('PublishAction', ({ values }) => values);

  React.useEffect(() => {
    if (isErrorDraftRelations) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: getTranslation('error.records.fetch-draft-relatons'),
          defaultMessage: 'An error occurred while fetching draft relations on this document.',
        }),
      });
    }
  }, [isErrorDraftRelations, toggleNotification, formatMessage]);

  React.useEffect(() => {
    const localDraftRelations = new Set();

    /**
     * Extracts draft relations from the provided data object.
     * It checks for a connect array of relations.
     * If a relation has a status of 'draft', its id is added to the localDraftRelations set.
     */
    const extractDraftRelations = (data: Omit<RelationsFormValue, 'disconnect'>) => {
      const relations = data.connect || [];
      relations.forEach((relation) => {
        if (relation.status === 'draft') {
          localDraftRelations.add(relation.id);
        }
      });
    };

    /**
     * Recursively traverses the provided data object to extract draft relations from arrays within 'connect' keys.
     * If the data is an object, it looks for 'connect' keys to pass their array values to extractDraftRelations.
     * It recursively calls itself for any non-null objects it contains.
     */
    const traverseAndExtract = (data: { [field: string]: any }) => {
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'connect' && Array.isArray(value)) {
          extractDraftRelations({ connect: value });
        } else if (typeof value === 'object' && value !== null) {
          traverseAndExtract(value);
        }
      });
    };

    if (!documentId || modified) {
      traverseAndExtract(formValues);
      setLocalCountOfDraftRelations(localDraftRelations.size);
    }
  }, [documentId, modified, formValues, setLocalCountOfDraftRelations]);

  React.useEffect(() => {
    if (!document || !document.documentId || isListView) {
      return;
    }

    const fetchDraftRelationsCount = async () => {
      const { data, error } = await countDraftRelations({
        collectionType,
        model,
        documentId,
        params,
      });

      if (error) {
        throw error;
      }

      if (data) {
        setServerCountOfDraftRelations(data.data);
      }
    };

    fetchDraftRelationsCount();
  }, [isListView, document, documentId, countDraftRelations, collectionType, model, params]);

  const isDocumentPublished =
    (document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
      meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null)) &&
    document?.status !== 'modified';

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  const performPublish = async () => {
    setSubmitting(true);

    try {
      const { errors } = await validate(true, {
        status: 'published',
      });

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
  };

  const totalDraftRelations = localCountOfDraftRelations + serverCountOfDraftRelations;

  // TODO skipping this for now as there is a bug with the draft relation count that will be worked on separately
  // see RFC "Count draft relations" in Notion
  const enableDraftRelationsCount = false;
  const hasDraftRelations = enableDraftRelationsCount && totalDraftRelations > 0;

  return {
    /**
     * Disabled when:
     *  - currently if you're cloning a document we don't support publish & clone at the same time.
     *  - the form is submitting
     *  - the active tab is the published tab
     *  - the document is already published & not modified
     *  - the document is being created & not modified
     *  - the user doesn't have the permission to publish
     */
    disabled:
      isCloning ||
      isSubmitting ||
      isLoadingDraftRelations ||
      activeTab === 'published' ||
      (!modified && isDocumentPublished) ||
      (!modified && !document?.documentId) ||
      !canPublish,
    label: formatMessage({
      id: 'app.utils.publish',
      defaultMessage: 'Publish',
    }),
    onClick: async () => {
      if (hasDraftRelations) {
        // In this case we need to show the user a confirmation dialog.
        // Return from the onClick and let the dialog handle the process.
        return;
      }

      await performPublish();
    },
    dialog: hasDraftRelations
      ? {
          type: 'dialog',
          variant: 'danger',
          footer: null,
          title: formatMessage({
            id: getTranslation(`popUpwarning.warning.bulk-has-draft-relations.title`),
            defaultMessage: 'Confirmation',
          }),
          content: formatMessage(
            {
              id: getTranslation(`popUpwarning.warning.bulk-has-draft-relations.message`),
              defaultMessage:
                'This entry is related to {count, plural, one {# draft entry} other {# draft entries}}. Publishing it could leave broken links in your app.',
            },
            {
              count: totalDraftRelations,
            }
          ),
          onConfirm: async () => {
            await performPublish();
          },
        }
      : undefined,
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
     */
    disabled: isSubmitting || (!modified && !isCloning) || activeTab === 'published',
    label: formatMessage({
      id: 'content-manager.containers.Edit.save',
      defaultMessage: 'Save',
    }),
    onClick: async () => {
      setSubmitting(true);

      try {
        const { errors } = await validate(true, {
          status: 'draft',
        });

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
            navigate(
              {
                pathname: `../${res.data.documentId}`,
                search: rawQuery,
              },
              { relative: 'path' }
            );
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
            navigate(
              {
                pathname: `../${res.data.documentId}`,
                search: rawQuery,
              },
              { replace: true, relative: 'path' }
            );
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

  const handleChange = (value: string) => {
    setShouldKeepDraft(value === UNPUBLISH_DRAFT_OPTIONS.KEEP);
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
    icon: <Cross />,
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
              <Radio.Group
                defaultValue={UNPUBLISH_DRAFT_OPTIONS.KEEP}
                name="discard-options"
                aria-label={formatMessage({
                  id: 'content-manager.actions.unpublish.dialog.radio-label',
                  defaultMessage: 'Choose an option to unpublish the document.',
                })}
                onValueChange={handleChange}
              >
                <Radio.Item checked={shouldKeepDraft} value={UNPUBLISH_DRAFT_OPTIONS.KEEP}>
                  {formatMessage({
                    id: 'content-manager.actions.unpublish.dialog.option.keep-draft',
                    defaultMessage: 'Keep draft',
                  })}
                </Radio.Item>
                <Radio.Item checked={!shouldKeepDraft} value={UNPUBLISH_DRAFT_OPTIONS.DISCARD}>
                  {formatMessage({
                    id: 'content-manager.actions.unpublish.dialog.option.replace-draft',
                    defaultMessage: 'Replace draft',
                  })}
                </Radio.Item>
              </Radio.Group>
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
    icon: <Cross />,
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

const DEFAULT_ACTIONS = [PublishAction, UpdateAction, UnpublishAction, DiscardAction];

export { DocumentActions, DocumentActionsMenu, DocumentActionButton, DEFAULT_ACTIONS };
export type { DocumentActionDescription, DialogOptions, NotificationOptions, ModalOptions };
