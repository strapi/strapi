import * as React from 'react';

import {
  useForm,
  useNotification,
  NotificationConfig,
  useAPIErrorHandler,
  useQueryParams,
  tours,
  useGuidedTour,
  GUIDED_TOUR_REQUIRED_ACTIONS,
  useIsDesktop,
} from '@strapi/admin/strapi-admin';
import {
  Button,
  Dialog,
  Flex,
  Modal,
  Radio,
  Typography,
  Menu,
  ButtonProps,
  Tooltip,
  IconButton,
} from '@strapi/design-system';
import { Cross, More, WarningCircle } from '@strapi/icons';
import mapValues from 'lodash/fp/mapValues';
import get from 'lodash/get';
import merge from 'lodash/merge';
import set from 'lodash/set';
import { useIntl } from 'react-intl';
import { useMatch, useNavigate, useParams } from 'react-router-dom';

import { Create, Publish } from '../../../../../shared/contracts/collection-types';
import { PUBLISHED_AT_ATTRIBUTE_NAME } from '../../../constants/attributes';
import { SINGLE_TYPES } from '../../../constants/collections';
import { useDocumentRBAC } from '../../../features/DocumentRBAC';
import { useDoc, useDocument } from '../../../hooks/useDocument';
import { useDocumentActions } from '../../../hooks/useDocumentActions';
import { useDocumentContext } from '../../../hooks/useDocumentContext';
import { usePreviewContext } from '../../../preview/pages/Preview';
import { CLONE_PATH, LIST_PATH } from '../../../router';
import {
  useGetDraftRelationCountQuery,
  useUpdateDocumentMutation,
} from '../../../services/documents';
import { isBaseQueryError, buildValidParams } from '../../../utils/api';
import { getTranslation } from '../../../utils/translations';
import { AnyData, handleInvisibleAttributes } from '../utils/data';
import { getEditViewShortcut } from '../utils/keyboardShortcuts';

import { useRelationModal } from './FormInputs/Relations/RelationModal';

import type { Component } from '../../../../../shared/contracts/components';
import type { DocumentActionComponent } from '../../../content-manager';
import type { RelationsFormValue } from './FormInputs/Relations/Relations';
import type { ComponentsDictionary, Schema } from '../../../hooks/useDocument';

interface DraftRelationCounts {
  unpublishedRelations: number;
  draftM2mLinks: number;
}

const EMPTY_DRAFT_RELATION_COUNTS: DraftRelationCounts = {
  unpublishedRelations: 0,
  draftM2mLinks: 0,
};

const isBidirectionalManyToMany = (attribute: Schema['attributes'][string]) => {
  if (attribute.type !== 'relation' || attribute.relation !== 'manyToMany') {
    return false;
  }

  const relationAttribute = attribute as Extract<
    Schema['attributes'][string],
    { type: 'relation'; relation: 'manyToMany' }
  > & {
    inversedBy?: string;
    mappedBy?: string;
  };

  return Boolean(relationAttribute.inversedBy || relationAttribute.mappedBy);
};

const mergeDraftRelationCounts = (
  left: DraftRelationCounts,
  right: DraftRelationCounts
): DraftRelationCounts => ({
  unpublishedRelations: left.unpublishedRelations + right.unpublishedRelations,
  draftM2mLinks: left.draftM2mLinks + right.draftM2mLinks,
});

const normalizeDraftRelationCounts = (payload: unknown): DraftRelationCounts => {
  if (
    payload &&
    typeof payload === 'object' &&
    'unpublishedRelations' in payload &&
    'draftM2mLinks' in payload
  ) {
    return payload as DraftRelationCounts;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return normalizeDraftRelationCounts((payload as { data: unknown }).data);
  }

  return EMPTY_DRAFT_RELATION_COUNTS;
};

/**
 * Counts draft relations in unsaved form values, excluding self-referential relations
 * (preserved on publish via document-service self-referential-relations).
 */
const countLocalDraftRelations = (
  data: Record<string, unknown>,
  schema: Schema | Component | undefined,
  components: ComponentsDictionary,
  contentTypeUid: string
): DraftRelationCounts => {
  if (!schema?.attributes) {
    return EMPTY_DRAFT_RELATION_COUNTS;
  }

  return Object.keys(schema.attributes).reduce((counts, attributeName) => {
    const attribute = schema.attributes[attributeName];
    const value = data[attributeName];

    if (!value) {
      return counts;
    }

    switch (attribute.type) {
      case 'relation': {
        if (!('target' in attribute) || attribute.target === contentTypeUid) {
          return counts;
        }

        if (typeof value === 'object' && value !== null && 'connect' in value) {
          const draftConnectCount =
            (value as RelationsFormValue).connect?.filter((relation) => relation.status === 'draft')
              .length ?? 0;

          if (draftConnectCount === 0) {
            return counts;
          }

          if (isBidirectionalManyToMany(attribute)) {
            return {
              ...counts,
              draftM2mLinks: counts.draftM2mLinks + draftConnectCount,
            };
          }

          return {
            ...counts,
            unpublishedRelations: counts.unpublishedRelations + draftConnectCount,
          };
        }

        return counts;
      }
      case 'component': {
        const componentItems = Array.isArray(value) ? value : [value];
        const componentSchema = components[attribute.component];

        return componentItems.reduce(
          (componentCounts, componentValue) =>
            mergeDraftRelationCounts(
              componentCounts,
              countLocalDraftRelations(
                componentValue as Record<string, unknown>,
                componentSchema,
                components,
                contentTypeUid
              )
            ),
          counts
        );
      }
      case 'dynamiczone': {
        return (value as Array<Record<string, unknown>>).reduce((zoneCounts, componentValue) => {
          const componentUid = componentValue.__component as string;

          return mergeDraftRelationCounts(
            zoneCounts,
            countLocalDraftRelations(
              componentValue,
              components[componentUid],
              components,
              contentTypeUid
            )
          );
        }, counts);
      }
      default:
        return counts;
    }
  }, EMPTY_DRAFT_RELATION_COUNTS);
};

type PublishConfirmDialogScope = 'panel' | 'preview' | 'relation-modal';

const publishConfirmDialogOpeners = new Map<PublishConfirmDialogScope, () => void>();

const openPublishConfirmDialog = (scope: PublishConfirmDialogScope) => {
  publishConfirmDialogOpeners.get(scope)?.();
};

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/
type DocumentActionPosition = 'panel' | 'header' | 'table-row' | 'preview' | 'relation-modal';

interface DocumentActionDescription {
  label: string;
  type?: 'publish' | 'update' | 'unpublish' | 'discard';
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
  loading?: ButtonProps['loading'];
  /**
   * When set on a publish action with a dialog, registers an opener for the keyboard shortcut.
   */
  publishConfirmScope?: PublishConfirmDialogScope;
}

interface DialogOptions {
  type: 'dialog';
  title: string;
  content?: React.ReactNode;
  variant?: ButtonProps['variant'];
  confirmLabel?: string;
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

const connectRelationToParent = (
  parentDataToUpdate: AnyData | undefined,
  fieldToConnect: string,
  data: Create.Response['data'] | Publish.Response['data'],
  fieldToConnectUID?: string
) => {
  /*
   * Check if the fieldToConnect is already present in the parentDataToUpdate.
   * This happens in particular when in the parentDocument you have created
   * a new component without saving.
   */
  const isFieldPresent = !!get(parentDataToUpdate, fieldToConnect);
  const fieldToConnectPath = isFieldPresent
    ? fieldToConnect
    : // Compute the path to the parent object
      fieldToConnect.split('.').slice(0, -1).join('.');
  const fieldToConnectValue = isFieldPresent
    ? {
        connect: [
          {
            id: data.documentId,
            documentId: data.documentId,
            locale: data.locale,
          },
        ],
      }
    : {
        [fieldToConnect.split('.').pop()!]: {
          connect: [
            {
              id: data.documentId,
              documentId: data.documentId,
              locale: data.locale,
            },
          ],
          disconnect: [],
        },
        // In case the object was not present you need to pass the componentUID of the parent document
        __component: fieldToConnectUID,
      };
  const objectToConnect = set({}, fieldToConnectPath, fieldToConnectValue);
  return merge(parentDataToUpdate, objectToConnect);
};

const DocumentActions = ({ actions }: DocumentActionsProps) => {
  const { formatMessage } = useIntl();
  const isDesktop = useIsDesktop();
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

  const addHintTooltip = (action: Action, children: React.ReactNode) => {
    if (action.disabled) {
      return children;
    }

    const hint =
      action.type === 'publish'
        ? formatMessage({
            id: 'content-manager.containers.EditView.publishHint',
            defaultMessage: 'Ctrl / Cmd + Shift + Enter to publish',
          })
        : formatMessage({
            id: 'content-manager.containers.EditView.saveHint',
            defaultMessage: 'Ctrl / Cmd + Enter to save',
          });

    return (
      <Tooltip label={hint}>
        <Flex width="100%">{children}</Flex>
      </Tooltip>
    );
  };

  const primaryActionContent = (
    <>
      <Flex flex={1} alignItems="stretch" direction="column">
        {addHintTooltip(
          primaryAction,
          <DocumentActionButton
            {...primaryAction}
            variant={primaryAction.variant || 'default'}
            buttonType={primaryAction.type === 'publish' ? undefined : 'submit'}
          />
        )}
      </Flex>

      {restActions.length > 0 ? (
        <DocumentActionsMenu
          actions={restActions}
          label={formatMessage({
            id: 'content-manager.containers.edit.panels.default.more-actions',
            defaultMessage: 'More document actions',
          })}
        />
      ) : null}
    </>
  );

  return (
    <Flex direction={{ initial: 'row', large: 'column' }} gap={2} alignItems="stretch" width="100%">
      <tours.contentManager.Publish>
        {isDesktop ? <Flex gap={2}>{primaryActionContent}</Flex> : primaryActionContent}
      </tours.contentManager.Publish>
      {secondaryAction ? (
        <Flex flex={1} order={{ initial: -1, large: 0 }} alignItems="stretch" direction="column">
          {secondaryAction.type === 'publish' ? (
            <tours.contentManager.Publish>
              {addHintTooltip(
                secondaryAction,
                <DocumentActionButton
                  {...secondaryAction}
                  variant={secondaryAction.variant || 'secondary'}
                />
              )}
            </tours.contentManager.Publish>
          ) : (
            addHintTooltip(
              secondaryAction,
              <DocumentActionButton
                {...secondaryAction}
                variant={secondaryAction.variant || 'secondary'}
                buttonType="submit"
              />
            )
          )}
        </Flex>
      ) : null}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DocumentActionButton
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionButtonProps extends Omit<Action, 'type'> {
  buttonType?: 'button' | 'submit' | 'reset';
  type?: DocumentActionDescription['type'];
}

const DocumentActionButton = ({ buttonType = 'button', ...action }: DocumentActionButtonProps) => {
  const [dialogId, setDialogId] = React.useState<string | null>(null);
  const { toggleNotification } = useNotification();

  React.useEffect(() => {
    const scope = action.publishConfirmScope;

    if (action.type !== 'publish' || !action.dialog || !scope) {
      return;
    }

    const open = () => setDialogId(action.id);
    publishConfirmDialogOpeners.set(scope, open);

    return () => {
      if (publishConfirmDialogOpeners.get(scope) === open) {
        publishConfirmDialogOpeners.delete(scope);
      }
    };
  }, [action.type, action.dialog, action.id, action.publishConfirmScope]);

  const handleClick = (action: DocumentActionButtonProps) => async (e: React.MouseEvent) => {
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
        loading={action.loading}
        type={buttonType}
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
  const triggerRef = React.useRef<HTMLButtonElement>(null);

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

  const handleOpenChange = (open: boolean) => {
    if (!isDisabled) {
      setIsOpen(open);
    }
  };

  return (
    <Menu.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Menu.Trigger
        ref={triggerRef}
        disabled={isDisabled}
        label={
          label ||
          formatMessage({
            id: 'content-manager.containers.edit.panels.default.more-actions',
            defaultMessage: 'More document actions',
          })
        }
        tag={IconButton}
        icon={<More />}
        variant={variant}
      />
      <Menu.Content maxHeight={undefined} popoverPlacement="bottom-end" maxWidth="25rem">
        {actions.map((action) => {
          return (
            <Menu.Item
              disabled={action.disabled}
              /* @ts-expect-error – TODO: this is an error in the DS where it is most likely a synthetic event, not regular. */
              onSelect={handleClick(action)}
              display="block"
              key={action.id}
              variant={action.variant === 'danger' ? action.variant : 'default'}
              startIcon={action.icon}
            >
              <Flex justifyContent="space-between" gap={4}>
                <Flex gap={2} tag="span">
                  {action.label}
                </Flex>
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

/* -------------------------------------------------------------------------------------------------
 * DocumentActionConfirmDialog
 * -----------------------------------------------------------------------------------------------*/

interface DocumentActionConfirmDialogProps extends DialogOptions, Pick<Action, 'variant'> {
  onClose: () => void;
  isOpen: Dialog.Props['open'];
  loading?: ButtonProps['loading'];
}

const DocumentActionConfirmDialog = ({
  onClose,
  onCancel,
  onConfirm,
  title,
  content,
  confirmLabel,
  isOpen,
  variant = 'secondary',
  loading,
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
          <Button onClick={handleConfirm} variant={variant} fullWidth loading={loading}>
            {confirmLabel ??
              formatMessage({
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

const transformData = (data: Record<string, any>): any => {
  if (Array.isArray(data)) {
    return data.map(transformData);
  }

  if (typeof data === 'object' && data !== null) {
    if ('apiData' in data) {
      return data.apiData;
    }

    return mapValues(transformData)(data);
  }

  return data;
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
  const {
    currentDocument: { schema },
  } = useDocumentContext('PublishAction');

  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatValidationErrors: formatValidationErrors } = useAPIErrorHandler();
  const isListView = useMatch(LIST_PATH) !== null;
  const isCloning = useMatch(CLONE_PATH) !== null;
  const { id } = useParams();
  const { formatMessage } = useIntl();
  const { canPublish, canReadFields } = useDocumentRBAC(
    'PublishAction',
    ({ canPublish, canReadFields }) => ({ canPublish, canReadFields })
  );
  const { publish, isLoading } = useDocumentActions();
  const onPreview = usePreviewContext('PublishAction', (state) => state.onPreview, false);
  const [countDraftRelations, { isError: isErrorDraftRelations }] = useGetDraftRelationCountQuery();
  const [localDraftRelationCounts, setLocalDraftRelationCounts] =
    React.useState<DraftRelationCounts>(EMPTY_DRAFT_RELATION_COUNTS);
  const [serverDraftRelationCounts, setServerDraftRelationCounts] =
    React.useState<DraftRelationCounts>(EMPTY_DRAFT_RELATION_COUNTS);
  const [isFetchingDraftRelations, setIsFetchingDraftRelations] = React.useState(false);

  const [{ rawQuery }] = useQueryParams();

  const modified = useForm('PublishAction', ({ modified }) => modified);
  const setSubmitting = useForm('PublishAction', ({ setSubmitting }) => setSubmitting);
  const isSubmitting = useForm('PublishAction', ({ isSubmitting }) => isSubmitting);
  const validate = useForm('PublishAction', (state) => state.validate);
  const setErrors = useForm('PublishAction', (state) => state.setErrors);
  const getValues = useForm('PublishAction', (state) => state.getValues);
  const formValues = useForm('PublishAction', ({ values }) => values);
  const resetForm = useForm('PublishAction', ({ resetForm }) => resetForm);
  const {
    currentDocument: { components },
  } = useDocumentContext('PublishAction');

  // need to discriminate if the publish is coming from a relation modal or in the edit view
  const relationContext = useRelationModal('PublishAction', () => true, false);
  const fromRelationModal = relationContext != undefined;
  const isRelationModalOpen = useRelationModal(
    'PublishAction',
    (state) => state.state.isModalOpen,
    false
  );
  const publishConfirmScope: PublishConfirmDialogScope = fromRelationModal
    ? 'relation-modal'
    : onPreview
      ? 'preview'
      : 'panel';

  const dispatch = useRelationModal('PublishAction', (state) => state.dispatch);
  const fieldToConnect = useRelationModal(
    'PublishAction',
    (state) => state.state.fieldToConnect,
    false
  );
  const fieldToConnectUID = useRelationModal(
    'PublishAction',
    (state) => state.state.fieldToConnectUID,
    false
  );
  const documentHistory = useRelationModal(
    'PublishAction',
    (state) => state.state.documentHistory,
    false
  );
  const rootDocumentMeta = useRelationModal('PublishAction', (state) => state.rootDocumentMeta);

  const dispatchGuidedTour = useGuidedTour('PublishAction', (s) => s.dispatch);

  const { currentDocumentMeta } = useDocumentContext('PublishAction');
  const [updateDocumentMutation] = useUpdateDocumentMutation();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const idToPublish = currentDocumentMeta.documentId || id;

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
    if (!documentId || modified) {
      setLocalDraftRelationCounts(countLocalDraftRelations(formValues, schema, components, model));
    } else {
      setLocalDraftRelationCounts(EMPTY_DRAFT_RELATION_COUNTS);
    }
  }, [components, documentId, formValues, model, modified, schema]);

  const fetchDraftRelationsCount = React.useCallback(async () => {
    if (!document?.documentId || isListView) {
      return;
    }

    setIsFetchingDraftRelations(true);

    try {
      const { data, error } = await countDraftRelations({
        collectionType,
        model,
        documentId,
        params: currentDocumentMeta.params,
      });

      if (error) {
        throw error;
      }

      if (data) {
        setServerDraftRelationCounts(normalizeDraftRelationCounts(data));
      }
    } finally {
      setIsFetchingDraftRelations(false);
    }
  }, [
    collectionType,
    countDraftRelations,
    currentDocumentMeta.params,
    document?.documentId,
    documentId,
    isListView,
    model,
  ]);

  React.useEffect(() => {
    fetchDraftRelationsCount();
  }, [fetchDraftRelationsCount, document?.updatedAt]);

  React.useEffect(() => {
    const handleWindowFocus = () => {
      fetchDraftRelationsCount();
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchDraftRelationsCount]);
  const parentDocumentMetaToUpdate = documentHistory?.at(-2) ?? rootDocumentMeta;
  const parentDocumentData = useDocument(
    {
      documentId: parentDocumentMetaToUpdate?.documentId,
      model: parentDocumentMetaToUpdate?.model,
      collectionType: parentDocumentMetaToUpdate?.collectionType,
      params: parentDocumentMetaToUpdate?.params,
    },
    { skip: !parentDocumentMetaToUpdate }
  );
  const { getInitialFormValues } = useDoc();

  const isDocumentPublished =
    (document?.[PUBLISHED_AT_ATTRIBUTE_NAME] ||
      meta?.availableStatus.some((doc) => doc[PUBLISHED_AT_ATTRIBUTE_NAME] !== null)) &&
    document?.status !== 'modified';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const performPublish = async () => {
    setSubmitting(true);

    try {
      /**
       * Yield one microtask so React can flush any pending field updates from the same task
       * (common with fast local runners / Playwright) before we read values and validate.
       * TODO: replace with an explicit form flush contract when we can (same concern as Save flow).
       */
      await Promise.resolve();

      const { errors } = await validate(true, {
        status: 'published',
      });
      if (errors) {
        const hasUnreadableRequiredField =
          schema &&
          Object.keys(schema.attributes).some((fieldName) => {
            const attribute = schema.attributes[fieldName];

            // For components, check if any of the component fields are readable
            if (attribute.type === 'component') {
              const componentFields = (canReadFields ?? []).filter((field) =>
                field.startsWith(`${fieldName}.`)
              );
              return componentFields.length === 0;
            }

            // For regular fields, check if the field itself is readable
            return attribute?.required && !(canReadFields ?? []).includes(fieldName);
          });

        if (hasUnreadableRequiredField) {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'content-manager.validation.error.unreadable-required-field',
              defaultMessage:
                'Your current permissions prevent access to certain required fields. Please request access from an administrator to proceed.',
            }),
          });
        } else {
          toggleNotification({
            type: 'danger',
            message: formatMessage({
              id: 'content-manager.validation.error',
              defaultMessage:
                'There are validation errors in your document. Please fix them before saving.',
            }),
          });
        }
        return;
      }

      const { data } = handleInvisibleAttributes(transformData(getValues()), {
        schema,
        components,
      });
      const res = await publish(
        {
          collectionType,
          model,
          documentId,
          params: currentDocumentMeta.params,
        },
        data
      );

      // Reset form with current values as new initial values (clears errors/submitting and sets modified to false)
      if ('data' in res) {
        resetForm(getValues());
        dispatchGuidedTour({
          type: 'set_completed_actions',
          payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent],
        });
      }

      if ('data' in res && collectionType !== SINGLE_TYPES) {
        /**
         * TODO: refactor the router so we can just do `../${res.data.documentId}` instead of this.
         */
        if (idToPublish === 'create' && !fromRelationModal) {
          navigate({
            pathname: `../${collectionType}/${model}/${res.data.documentId}`,
            search: rawQuery,
          });
        } else if (fromRelationModal) {
          const newRelation = {
            documentId: res.data.documentId,
            collectionType,
            model,
            params: currentDocumentMeta.params,
          };

          /*
           * Update, if needed, the parent relation with the newly published document.
           * Check if in history we have the parent relation otherwise use the
           * rootDocument
           */
          if (
            fieldToConnect &&
            documentHistory &&
            (parentDocumentMetaToUpdate.documentId ||
              parentDocumentMetaToUpdate.collectionType === SINGLE_TYPES)
          ) {
            const parentDataToUpdate =
              parentDocumentMetaToUpdate.collectionType === SINGLE_TYPES
                ? getInitialFormValues()
                : parentDocumentData.getInitialFormValues();
            const metaDocumentToUpdate = documentHistory.at(-2) ?? rootDocumentMeta;

            const dataToUpdate = connectRelationToParent(
              parentDataToUpdate,
              fieldToConnect,
              res.data,
              fieldToConnectUID
            );

            try {
              const updateRes = await updateDocumentMutation({
                collectionType: metaDocumentToUpdate.collectionType,
                model: metaDocumentToUpdate.model,
                documentId:
                  metaDocumentToUpdate.collectionType !== SINGLE_TYPES
                    ? metaDocumentToUpdate.documentId
                    : undefined,
                params: metaDocumentToUpdate.params,
                data: dataToUpdate,
              });

              if ('error' in updateRes) {
                toggleNotification({ type: 'danger', message: formatAPIError(updateRes.error) });
                return;
              }
            } catch (err) {
              toggleNotification({
                type: 'danger',
                message: formatMessage({
                  id: 'notification.error',
                  defaultMessage: 'An error occurred',
                }),
              });

              throw err;
            }
          }

          dispatch({
            type: 'GO_TO_CREATED_RELATION',
            payload: { document: newRelation, shouldBypassConfirmation: true },
          });
        }
      } else if (
        'error' in res &&
        isBaseQueryError(res.error) &&
        res.error.name === 'ValidationError'
      ) {
        setErrors(formatValidationErrors(res.error));
      }
    } finally {
      setSubmitting(false);
      if (onPreview) {
        onPreview();
      }
    }
  };

  const draftRelationCounts = !documentId
    ? localDraftRelationCounts
    : modified
      ? mergeDraftRelationCounts(localDraftRelationCounts, serverDraftRelationCounts)
      : serverDraftRelationCounts;
  const { unpublishedRelations, draftM2mLinks } = draftRelationCounts;
  const hasUnpublishedRelations = unpublishedRelations > 0;
  const hasDraftM2mLinks = draftM2mLinks > 0;
  const hasDraftRelations = hasUnpublishedRelations || hasDraftM2mLinks;
  const isM2mOnlyDraftRelations = hasDraftM2mLinks && !hasUnpublishedRelations;

  /**
   * Disabled when:
   *  - currently if you're cloning a document we don't support publish & clone at the same time.
   *  - the form is submitting
   *  - the active tab is the published tab
   *  - the document is already published & not modified
   *  - the document is being created & not modified
   *  - the user doesn't have the permission to publish
   */
  const isDisabled =
    isCloning ||
    isSubmitting ||
    isFetchingDraftRelations ||
    activeTab === 'published' ||
    (!modified && isDocumentPublished) ||
    (!modified && !document?.documentId) ||
    !canPublish;

  // Publish on CMD+Shift+Enter (macOS) / CTRL+Shift+Enter (Windows/Linux).
  // Saving a draft (CMD/CTRL+Enter) is handled by the UpdateAction.
  React.useEffect(() => {
    if (!schema?.options?.draftAndPublish) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (getEditViewShortcut(e) !== 'publish') {
        return;
      }

      e.preventDefault();

      if (!fromRelationModal && isRelationModalOpen) {
        return;
      }

      if (isDisabled) {
        return;
      }

      if (hasDraftRelations) {
        openPublishConfirmDialog(publishConfirmScope);
        return;
      }

      performPublish();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    fromRelationModal,
    hasDraftRelations,
    isDisabled,
    isRelationModalOpen,
    performPublish,
    publishConfirmScope,
    schema?.options?.draftAndPublish,
  ]);

  if (!schema?.options?.draftAndPublish) {
    return null;
  }

  return {
    type: 'publish',
    loading: isLoading,
    position: ['panel', 'preview', 'relation-modal'],
    disabled: isDisabled,
    publishConfirmScope: hasDraftRelations ? publishConfirmScope : undefined,
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
          variant: isM2mOnlyDraftRelations ? 'default' : 'danger',
          title: formatMessage({
            id: getTranslation('popUpWarning.warning.has-draft-relations.title'),
            defaultMessage: 'Confirmation',
          }),
          content: (
            <>
              {hasUnpublishedRelations
                ? formatMessage(
                    {
                      id: getTranslation('popUpWarning.warning.has-draft-relations.message'),
                      defaultMessage:
                        'This entry is related to {count, plural, one {# draft entry} other {# draft entries}}. They will not appear on the live site until those entries are published.',
                    },
                    {
                      count: unpublishedRelations,
                    }
                  )
                : formatMessage(
                    {
                      id: getTranslation('popUpWarning.warning.has-draft-m2m-relations.message'),
                      defaultMessage:
                        '{count, plural, one {# linked entry is} other {# linked entries are}} still in draft. They will not appear on the live site until those entries are published.',
                    },
                    {
                      count: draftM2mLinks,
                    }
                  )}
              {hasUnpublishedRelations && hasDraftM2mLinks
                ? ` ${formatMessage(
                    {
                      id: getTranslation('popUpWarning.warning.has-draft-m2m-relations.additional'),
                      defaultMessage:
                        '{count, plural, one {# many-to-many link points} other {# many-to-many links point}} to draft entries that will become visible once published.',
                    },
                    {
                      count: draftM2mLinks,
                    }
                  )}`
                : null}{' '}
              {formatMessage({
                id: getTranslation('popUpWarning.warning.publish-question'),
                defaultMessage: 'Do you still want to publish?',
              })}
            </>
          ),
          confirmLabel: isM2mOnlyDraftRelations
            ? formatMessage({
                id: 'app.utils.publish',
                defaultMessage: 'Publish',
              })
            : formatMessage({
                id: getTranslation('popUpwarning.warning.has-draft-relations.button-confirm'),
                defaultMessage: 'Publish without relations',
              }),
          onConfirm: async () => {
            await performPublish();
          },
        }
      : undefined,
  };
};

PublishAction.type = 'publish';
PublishAction.position = ['panel', 'preview', 'relation-modal'];

const UpdateAction: DocumentActionComponent = ({
  activeTab,
  documentId,
  model,
  collectionType,
}) => {
  const dispatchGuidedTour = useGuidedTour('UpdateAction', (s) => s.dispatch);
  const navigate = useNavigate();
  const { toggleNotification } = useNotification();
  const { _unstableFormatValidationErrors: formatValidationErrors } = useAPIErrorHandler();
  const cloneMatch = useMatch(CLONE_PATH);
  const isCloning = cloneMatch !== null;
  const { formatMessage } = useIntl();
  const { create, update, clone, isLoading } = useDocumentActions();
  const {
    currentDocument: { components },
  } = useDocumentContext('UpdateAction');
  const [{ rawQuery }] = useQueryParams();
  const onPreview = usePreviewContext('UpdateAction', (state) => state.onPreview, false);
  const { getInitialFormValues } = useDoc();

  const isSubmitting = useForm('UpdateAction', ({ isSubmitting }) => isSubmitting);
  const modified = useForm('UpdateAction', ({ modified }) => modified);
  const setSubmitting = useForm('UpdateAction', ({ setSubmitting }) => setSubmitting);
  const initialValues = useForm('UpdateAction', ({ initialValues }) => initialValues);
  const getValues = useForm('UpdateAction', (state) => state.getValues);
  const validate = useForm('UpdateAction', (state) => state.validate);
  const setErrors = useForm('UpdateAction', (state) => state.setErrors);
  const resetForm = useForm('UpdateAction', ({ resetForm }) => resetForm);

  const dispatch = useRelationModal('UpdateAction', (state) => state.dispatch);

  // need to discriminate if the update is coming from a relation modal or in the edit view
  const relationContext = useRelationModal('UpdateAction', () => true, false);
  const relationalModalSchema = useRelationModal(
    'UpdateAction',
    (state) => state.currentDocument.schema,
    false
  );
  const fieldToConnect = useRelationModal(
    'UpdateAction',
    (state) => state.state.fieldToConnect,
    false
  );
  const fieldToConnectUID = useRelationModal(
    'PublishAction',
    (state) => state.state.fieldToConnectUID,
    false
  );
  const documentHistory = useRelationModal(
    'UpdateAction',
    (state) => state.state.documentHistory,
    false
  );
  const rootDocumentMeta = useRelationModal('UpdateAction', (state) => state.rootDocumentMeta);
  const fromRelationModal = relationContext != undefined;

  const { currentDocumentMeta } = useDocumentContext('UpdateAction');
  const [updateDocumentMutation] = useUpdateDocumentMutation();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const parentDocumentMetaToUpdate = documentHistory?.at(-2) ?? rootDocumentMeta;
  const parentDocumentData = useDocument(
    {
      documentId: parentDocumentMetaToUpdate?.documentId,
      model: parentDocumentMetaToUpdate?.model,
      collectionType: parentDocumentMetaToUpdate?.collectionType,
      params: parentDocumentMetaToUpdate?.params,
    },
    { skip: !parentDocumentMetaToUpdate }
  );
  const { schema } = useDoc();

  const suitableSchema = fromRelationModal ? relationalModalSchema : schema;
  const hasDraftAndPublished = suitableSchema?.options?.draftAndPublish ?? false;

  /**
   * Disabled when:
   * - the form is submitting
   * - the document is not modified & we're not cloning (you can save a clone entity straight away)
   * - the active tab is the published tab
   */
  const isDisabled = isSubmitting || (!modified && !isCloning) || activeTab === 'published';

  const handleUpdate = async () => {
    setSubmitting(true);

    try {
      if (!modified) {
        return;
      }

      // Blur the active element so inputs that debounce into the form (e.g. blocks editor) flush
      // before validate/getValues — on fast clients Save can otherwise read stale field state.
      // Use the global DOM document — form values are not in scope here (avoid shadowing `document`).
      (globalThis.document?.activeElement as HTMLElement | undefined)?.blur();

      // Yield microtasks so batched React updates after blur/onChange can settle before validate
      // (same idea as performPublish; two ticks vs one gives a bit more room after focus/blur).
      // TODO: replace with an explicit field/form flush contract when available.
      await Promise.resolve();
      await Promise.resolve();

      const { errors } = await validate(true, {
        // enforce "published" validation if not using "draft and published"
        status: !hasDraftAndPublished ? 'published' : 'draft',
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

      const latestValues = getValues();

      if (isCloning) {
        const res = await clone(
          {
            model,
            documentId: cloneMatch.params.origin!,
            params: currentDocumentMeta.params,
          },
          transformData(latestValues)
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
        const { data } = handleInvisibleAttributes(transformData(latestValues), {
          schema: suitableSchema,
          initialValues,
          components,
        });
        const res = await update(
          {
            collectionType,
            model,
            documentId,
            params: currentDocumentMeta.params,
          },
          data
        );

        if ('error' in res && isBaseQueryError(res.error) && res.error.name === 'ValidationError') {
          setErrors(formatValidationErrors(res.error));
        } else {
          resetForm(latestValues);
        }
      } else {
        const { data } = handleInvisibleAttributes(transformData(latestValues), {
          schema: suitableSchema,
          initialValues,
          components,
        });
        const res = await create(
          {
            model,
            params: currentDocumentMeta.params,
          },
          data
        );

        if ('data' in res && collectionType !== SINGLE_TYPES) {
          if (fromRelationModal) {
            const createdRelation = {
              documentId: res.data.documentId,
              collectionType,
              model,
              params: currentDocumentMeta.params,
            };
            /*
             * Update, if needed, the parent relation with the newly published document.
             * Check if in history we have the parent relation otherwise use the
             * rootDocument
             */
            if (
              fieldToConnect &&
              documentHistory &&
              (parentDocumentMetaToUpdate.documentId ||
                parentDocumentMetaToUpdate.collectionType === SINGLE_TYPES)
            ) {
              const parentDataToUpdate =
                parentDocumentMetaToUpdate.collectionType === SINGLE_TYPES
                  ? getInitialFormValues()
                  : parentDocumentData.getInitialFormValues();

              const dataToUpdate = connectRelationToParent(
                parentDataToUpdate,
                fieldToConnect,
                res.data,
                fieldToConnectUID
              );

              try {
                const updateRes = await updateDocumentMutation({
                  collectionType: parentDocumentMetaToUpdate.collectionType,
                  model: parentDocumentMetaToUpdate.model,
                  documentId:
                    parentDocumentMetaToUpdate.collectionType !== SINGLE_TYPES
                      ? parentDocumentMetaToUpdate.documentId
                      : undefined,
                  params: parentDocumentMetaToUpdate.params,
                  data: {
                    ...dataToUpdate,
                  },
                });
                if ('error' in updateRes) {
                  toggleNotification({ type: 'danger', message: formatAPIError(updateRes.error) });
                  return;
                }
              } catch (err) {
                toggleNotification({
                  type: 'danger',
                  message: formatMessage({
                    id: 'notification.error',
                    defaultMessage: 'An error occurred',
                  }),
                });

                throw err;
              }
            }

            dispatch({
              type: 'GO_TO_CREATED_RELATION',
              payload: { document: createdRelation, shouldBypassConfirmation: true },
            });
          } else {
            navigate(
              {
                pathname: `../${res.data.documentId}`,
                search: rawQuery,
              },
              { replace: true, relative: 'path' }
            );
          }
        } else if (
          'error' in res &&
          isBaseQueryError(res.error) &&
          res.error.name === 'ValidationError'
        ) {
          setErrors(formatValidationErrors(res.error));
        }
      }
    } finally {
      dispatchGuidedTour({
        type: 'set_completed_actions',
        payload: [GUIDED_TOUR_REQUIRED_ACTIONS.contentManager.createContent],
      });
      setSubmitting(false);
      if (onPreview) {
        onPreview();
      }
    }
  };

  // Save a draft on CMD+Enter (macOS) / CTRL+Enter (Windows/Linux), with CMD/CTRL+S as an alias.
  // Publishing (CMD/CTRL+Shift+Enter) is handled by the PublishAction.
  // `handleUpdate` is recreated on every render, so we read the latest version (and the latest
  // disabled state) through refs and register the listener only once.
  const handleUpdateRef = React.useRef(handleUpdate);
  handleUpdateRef.current = handleUpdate;
  const isDisabledRef = React.useRef(isDisabled);
  isDisabledRef.current = isDisabled;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (getEditViewShortcut(e) !== 'save') {
        return;
      }

      e.preventDefault();

      if (!isDisabledRef.current) {
        handleUpdateRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return {
    loading: isLoading,
    disabled: isDisabled,
    label: formatMessage({
      id: 'global.save',
      defaultMessage: 'Save',
    }),
    onClick: handleUpdate,
    position: ['panel', 'preview', 'relation-modal'],
  };
};

UpdateAction.type = 'update';
UpdateAction.position = ['panel', 'preview', 'relation-modal'];

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
UnpublishAction.position = 'panel';

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
  const { discard, isLoading } = useDocumentActions();
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
      loading: isLoading,
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
DiscardAction.position = 'panel';

const DEFAULT_ACTIONS = [PublishAction, UpdateAction, UnpublishAction, DiscardAction];

export {
  DocumentActions,
  DocumentActionsMenu,
  DocumentActionButton,
  DEFAULT_ACTIONS,
  openPublishConfirmDialog,
};
export type {
  DocumentActionDescription,
  DocumentActionPosition,
  DialogOptions,
  NotificationOptions,
  ModalOptions,
};
