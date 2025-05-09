import * as React from 'react';

import {
  ConfirmDialog,
  DescriptionComponentRenderer,
  Form as FormContext,
  useRBAC,
  useStrapiApp,
  createContext,
  useForm,
  useQueryParams,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Dialog,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Modal,
  Typography,
  TextButton,
} from '@strapi/design-system';
import { ArrowLeft, ArrowsOut, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useLocation, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../../../../../constants/collections';
import { PERMISSIONS } from '../../../../../constants/plugin';
import { buildValidParams } from '../../../../../exports';
import { DocumentRBAC } from '../../../../../features/DocumentRBAC';
import { useDoc, useDocument, type UseDocument } from '../../../../../hooks/useDocument';
import { type DocumentMeta } from '../../../../../hooks/useDocumentContext';
import { useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import { useLazyGetDocumentQuery } from '../../../../../services/documents';
import { createYupSchema } from '../../../../../utils/validation';
import { DocumentActionButton } from '../../../components/DocumentActions';
import { DocumentStatus } from '../../DocumentStatus';
import { FormLayout } from '../../FormLayout';
import { ComponentProvider } from '../ComponentContext';

import type { ContentManagerPlugin, DocumentActionProps } from '../../../../../content-manager';

export function getCollectionType(url: string) {
  const regex = new RegExp(`(${COLLECTION_TYPES}|${SINGLE_TYPES})`);
  const match = url.match(regex);
  return match ? match[1] : undefined;
}

const StyledModalContent = styled(Modal.Content)`
  width: 90%;
  max-width: 100%;
  height: 90%;
  max-height: 100%;
`;

const getFullPageUrl = (currentDocumentMeta: DocumentMeta): string => {
  const isSingleType = currentDocumentMeta.collectionType === SINGLE_TYPES;
  const queryParams = currentDocumentMeta.params?.locale
    ? `?plugins[i18n][locale]=${currentDocumentMeta.params.locale}`
    : '';

  return `/content-manager/${currentDocumentMeta.collectionType}/${currentDocumentMeta.model}${isSingleType ? '' : '/' + currentDocumentMeta.documentId}${queryParams}`;
};

/* -------------------------------------------------------------------------------------------------
 * RelationModalRenderer
 * -----------------------------------------------------------------------------------------------*/

interface State {
  documentHistory: DocumentMeta[];
  confirmDialogIntent:
    | null // No dialog
    | 'close' // Close the modal
    | 'back' // Go back one document in the modal's history
    | 'navigate' // Open the document in the edit view instead of in the modal
    | DocumentMeta; // Open a specific document in the modal
  isModalOpen: boolean;
  hasUnsavedChanges: boolean;
  fieldToConnect?: string;
  fieldToConnectUID?: string;
}

type Action =
  | {
      type: 'GO_TO_RELATION';
      payload: {
        document: DocumentMeta;
        shouldBypassConfirmation: boolean;
        fieldToConnect?: string;
        fieldToConnectUID?: string;
      };
    }
  | {
      type: 'GO_BACK';
      payload: { shouldBypassConfirmation: boolean };
    }
  | {
      type: 'GO_FULL_PAGE';
    }
  | {
      type: 'GO_TO_CREATED_RELATION';
      payload: {
        document: DocumentMeta;
        shouldBypassConfirmation: boolean;
        fieldToConnect?: string;
        fieldToConnectUID?: string;
      };
    }
  | {
      type: 'CANCEL_CONFIRM_DIALOG';
    }
  | {
      type: 'CLOSE_MODAL';
      payload: { shouldBypassConfirmation: boolean };
    }
  | {
      type: 'SET_HAS_UNSAVED_CHANGES';
      payload: { hasUnsavedChanges: boolean };
    };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GO_TO_RELATION':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return {
          ...state,
          confirmDialogIntent: action.payload.document,
          fieldToConnect: action.payload.fieldToConnect,
          fieldToConnectUID: action.payload.fieldToConnectUID,
        };
      }

      const lastItemDocumentHistory = state.documentHistory.at(-1);
      const hasToResetDocumentHistory =
        lastItemDocumentHistory && !lastItemDocumentHistory.documentId;
      return {
        ...state,
        // Reset document history if the last item has documentId undefined
        documentHistory: hasToResetDocumentHistory
          ? [action.payload.document]
          : [...state.documentHistory, action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
        fieldToConnect: hasToResetDocumentHistory ? undefined : action.payload.fieldToConnect,
        fieldToConnectUID: hasToResetDocumentHistory ? undefined : action.payload.fieldToConnectUID,
      };
    case 'GO_BACK':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return { ...state, confirmDialogIntent: 'back' };
      }

      return {
        ...state,
        documentHistory: state.documentHistory.slice(0, -1),
        confirmDialogIntent: null,
      };
    case 'GO_FULL_PAGE':
      if (state.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'navigate' };
      }

      return {
        ...state,
        documentHistory: [],
        hasUnsavedChanges: false,
        isModalOpen: false,
        confirmDialogIntent: null,
      };
    case 'GO_TO_CREATED_RELATION':
      return {
        ...state,
        // Reset document history if the last item has documentId undefined
        documentHistory: state.documentHistory
          ? [...state.documentHistory.slice(0, -1), action.payload.document]
          : [action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
        fieldToConnect: undefined,
        fieldToConnectUID: undefined,
      };
    case 'CANCEL_CONFIRM_DIALOG':
      return {
        ...state,
        confirmDialogIntent: null,
      };
    case 'CLOSE_MODAL':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return { ...state, confirmDialogIntent: 'close' };
      }

      return {
        ...state,
        documentHistory: [],
        confirmDialogIntent: null,
        hasUnsavedChanges: false,
        isModalOpen: false,
      };
    case 'SET_HAS_UNSAVED_CHANGES':
      return {
        ...state,
        hasUnsavedChanges: action.payload.hasUnsavedChanges,
      };
    default:
      return state;
  }
}

interface RelationModalContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
  rootDocumentMeta: DocumentMeta;
  currentDocumentMeta: DocumentMeta;
  currentDocument: ReturnType<UseDocument>;
  onPreview?: () => void;
  isCreating: boolean;
}

const [RelationModalProvider, useRelationModal] =
  createContext<RelationModalContextValue>('RelationModal');

function isRenderProp(
  children: RelationModalRendererProps['children']
): children is (props: { dispatch: (action: Action) => void }) => React.ReactNode {
  return typeof children === 'function';
}

type RelationModalRendererProps =
  // Is editing
  | {
      relation: DocumentMeta;
      children: React.ReactNode;
    }
  // Is creating
  | {
      relation?: never;
      children: (props: { dispatch: (action: Action) => void }) => React.ReactNode;
    };

const RootRelationRenderer = (props: RelationModalRendererProps) => {
  const { children } = props;

  const [state, dispatch] = React.useReducer(reducer, {
    documentHistory: [],
    confirmDialogIntent: null,
    isModalOpen: false,
    hasUnsavedChanges: false,
    fieldToConnect: undefined,
  });

  const rootDocument = useDoc();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query ?? {}), [query]);

  const rootDocumentMeta: DocumentMeta = {
    documentId: rootDocument.document?.documentId || '',
    model: rootDocument.model,
    collectionType: rootDocument.collectionType,
    params,
  };

  const currentDocumentMeta = state.documentHistory.at(-1) ?? rootDocumentMeta;
  const currentDocument = useDocument(currentDocumentMeta);
  // TODO: check if we can remove the single type check
  const isSingleType = currentDocumentMeta.collectionType === SINGLE_TYPES;
  const isCreating = !currentDocumentMeta.documentId && !isSingleType;
  /**
   * There is no parent relation, so the relation modal doesn't exist. Create it and set up all the
   * pieces that will be used by potential child relations: the context, header, form, and footer.
   */
  return (
    <RelationModalProvider
      state={state}
      dispatch={dispatch}
      rootDocumentMeta={rootDocumentMeta}
      currentDocumentMeta={currentDocumentMeta}
      currentDocument={currentDocument}
      isCreating={isCreating}
    >
      <RelationModal>
        {isRenderProp(children)
          ? children({ dispatch })
          : props.relation && (
              <RelationModalTrigger relation={props.relation}>{children}</RelationModalTrigger>
            )}
      </RelationModal>
    </RelationModalProvider>
  );
};

const NestedRelationRenderer = (props: RelationModalRendererProps) => {
  const { children } = props;
  const dispatch = useRelationModal('NestedRelation', (state) => state.dispatch);

  return isRenderProp(children)
    ? children({ dispatch })
    : props.relation && (
        <RelationModalTrigger relation={props.relation}>{children}</RelationModalTrigger>
      ); /* This is the trigger that will be rendered in the parent relation */
};

/**
 * Component responsible for rendering its children wrapped in a modal, form and context if needed
 */
const RelationModalRenderer = (props: RelationModalRendererProps) => {
  // We're in a nested relation if the relation modal context is not undefined
  const isNested = useRelationModal('RelationContextWrapper', (state) => state != undefined, false);

  return isNested ? <NestedRelationRenderer {...props} /> : <RootRelationRenderer {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * RelationModal
 * -----------------------------------------------------------------------------------------------*/
const generateCreateUrl = (currentDocumentMeta: DocumentMeta) => {
  return `/content-manager/${currentDocumentMeta.collectionType}/${currentDocumentMeta.model}/create${
    currentDocumentMeta.params?.locale
      ? `?plugins[i18n][locale]=${currentDocumentMeta.params.locale}`
      : ''
  }`;
};

const RelationModal = ({ children }: { children: React.ReactNode }) => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const state = useRelationModal('RelationModalForm', (state) => state.state);
  const dispatch = useRelationModal('RelationModalForm', (state) => state.dispatch);
  const currentDocumentMeta = useRelationModal(
    'RelationModalForm',
    (state) => state.currentDocumentMeta
  );
  const currentDocument = useRelationModal('RelationModalForm', (state) => state.currentDocument);
  const isCreating = useRelationModal('RelationModalForm', (state) => state.isCreating);

  /*
   * We must wrap the modal window with Component Provider with reset values
   * to avoid inheriting id and uid from the root document and having weird
   * behaviors with simple relationships..
   */
  return (
    <ComponentProvider id={undefined} level={-1} uid={undefined} type={undefined}>
      <Modal.Root
        open={state.isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({
              type: 'CLOSE_MODAL',
              payload: { shouldBypassConfirmation: false },
            });
          }
        }}
      >
        {children}
        <StyledModalContent>
          <Modal.Header gap={2}>
            <Flex justifyContent="space-between" alignItems="center" width="100%">
              <Flex gap={2}>
                <IconButton
                  withTooltip={false}
                  label={formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
                  variant="ghost"
                  disabled={state.documentHistory.length < 2}
                  onClick={() => {
                    dispatch({
                      type: 'GO_BACK',
                      payload: { shouldBypassConfirmation: false },
                    });
                  }}
                  marginRight={1}
                >
                  <ArrowLeft />
                </IconButton>
                <Typography tag="span" fontWeight={600}>
                  {isCreating
                    ? formatMessage({
                        id: 'content-manager.relation.create',
                        defaultMessage: 'Create a relation',
                      })
                    : formatMessage({
                        id: 'content-manager.components.RelationInputModal.modal-title',
                        defaultMessage: 'Edit a relation',
                      })}
                </Typography>
              </Flex>
              <IconButton
                onClick={() => {
                  dispatch({
                    type: 'GO_FULL_PAGE',
                  });
                  if (!state.hasUnsavedChanges) {
                    if (isCreating) {
                      navigate(generateCreateUrl(currentDocumentMeta));
                    } else {
                      navigate(getFullPageUrl(currentDocumentMeta));
                    }
                  }
                }}
                variant="tertiary"
                label={formatMessage({
                  id: 'content-manager.components.RelationInputModal.button-fullpage',
                  defaultMessage: 'Go to entry',
                })}
              >
                <ArrowsOut />
              </IconButton>
            </Flex>
          </Modal.Header>
          <Modal.Body>
            <FormContext
              method={isCreating ? 'POST' : 'PUT'}
              initialValues={currentDocument.getInitialFormValues(isCreating)}
              validate={(values: Record<string, unknown>, options: Record<string, string>) => {
                const yupSchema = createYupSchema(
                  currentDocument.schema?.attributes,
                  currentDocument.components,
                  {
                    status: currentDocument.document?.status,
                    ...options,
                  }
                );

                return yupSchema.validate(values, { abortEarly: false });
              }}
            >
              <RelationModalBody />
            </FormContext>
          </Modal.Body>
        </StyledModalContent>
      </Modal.Root>
    </ComponentProvider>
  );
};
/**
 * All the main content (not header and footer) of the relation modal, plus the confirmation dialog.
 * Will be wrapped in a Modal.Body by the RelationModal component.
 * Cannot be moved directly inside RelationModal because it needs access to the context via hooks.
 */
const RelationModalBody = () => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { formatMessage } = useIntl();

  const [triggerRefetchDocument] = useLazyGetDocumentQuery();

  const state = useRelationModal('RelationModalForm', (state) => state.state);
  const dispatch = useRelationModal('RelationModalForm', (state) => state.dispatch);
  const rootDocumentMeta = useRelationModal('RelationModalForm', (state) => state.rootDocumentMeta);
  const currentDocumentMeta = useRelationModal(
    'RelationModalForm',
    (state) => state.currentDocumentMeta
  );
  const isCreating = useRelationModal('RelationModalForm', (state) => state.isCreating);

  /**
   * One-way sync the modified state from the form to the modal state.
   * It is needed because we need to consume state from the form context in order to lift it up
   * into the modal context. It is not possible otherwise because the modal needs the form state,
   * but it must be a parent of the form.
   */
  const modified = useForm('FormWatcher', (state) => state.modified);
  const isSubmitting = useForm('FormWatcher', (state) => state.isSubmitting);
  const hasUnsavedChanges = modified && !isSubmitting;
  React.useEffect(() => {
    dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: { hasUnsavedChanges } });
  }, [hasUnsavedChanges, dispatch]);

  const handleCloseModal = (shouldBypassConfirmation: boolean) => {
    dispatch({ type: 'CLOSE_MODAL', payload: { shouldBypassConfirmation } });

    if (shouldBypassConfirmation || !state.hasUnsavedChanges) {
      // TODO: check if we can avoid this by relying on RTK invalidatesTags.
      // If so we can delete this function and dispatch the events directly
      triggerRefetchDocument(
        // TODO check if params should be removed (as they were before)
        rootDocumentMeta,
        // Favor the cache
        true
      );
    }
  };

  const handleRedirection = () => {
    const editViewUrl = `${pathname}${search}`;
    const fullPageUrl = getFullPageUrl(currentDocumentMeta);
    const isRootDocumentUrl = editViewUrl.includes(fullPageUrl);

    if (isRootDocumentUrl) {
      handleCloseModal(true);
    } else {
      if (isCreating) {
        navigate(generateCreateUrl(currentDocumentMeta));
      } else {
        navigate(fullPageUrl);
      }
    }
  };

  const handleConfirm = () => {
    if (state.confirmDialogIntent === null) {
      return;
    }
    if (state.confirmDialogIntent === 'navigate') {
      handleRedirection();
    } else if (state.confirmDialogIntent === 'back') {
      dispatch({ type: 'GO_BACK', payload: { shouldBypassConfirmation: true } });
    } else if (state.confirmDialogIntent === 'close') {
      handleCloseModal(true);
    } else if ('documentId' in state.confirmDialogIntent) {
      dispatch({
        type: 'GO_TO_RELATION',
        payload: { document: state.confirmDialogIntent, shouldBypassConfirmation: true },
      });
    }
  };

  return (
    <>
      <RelationModalForm />
      <Dialog.Root open={state.confirmDialogIntent != null}>
        <ConfirmDialog
          onConfirm={() => handleConfirm()}
          onCancel={() => dispatch({ type: 'CANCEL_CONFIRM_DIALOG' })}
          variant="danger"
        >
          {formatMessage({
            id: 'content-manager.components.RelationInputModal.confirmation-message',
            defaultMessage:
              'Some changes were not saved. Are you sure you want to close this relation? All changes that were not saved will be lost.',
          })}
        </ConfirmDialog>
      </Dialog.Root>
    </>
  );
};

const RelationModalTrigger = ({
  children,
  relation,
}: {
  children: React.ReactNode;
  relation: DocumentMeta;
}) => {
  const dispatch = useRelationModal('ModalTrigger', (state) => state.dispatch);

  return (
    <StyledTextButton
      onClick={() => {
        dispatch({
          type: 'GO_TO_RELATION',
          payload: { document: relation, shouldBypassConfirmation: false },
        });
      }}
    >
      {children}
    </StyledTextButton>
  );
};

const StyledTextButton = styled(TextButton)`
  max-width: 100%;
  & > span {
    font-size: ${({ theme }) => theme.fontSizes[2]};
    width: inherit;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
`;

/**
 * The mini edit view for a relation that is displayed inside a modal.
 * It's complete with its header, document actions and form layout.
 */
const RelationModalForm = () => {
  const { formatMessage } = useIntl();

  const currentDocumentMeta = useRelationModal(
    'RelationModalForm',
    (state) => state.currentDocumentMeta
  );
  const isCreating = useRelationModal('RelationModalForm', (state) => state.isCreating);
  const currentDocument = useRelationModal('RelationModalForm', (state) => state.currentDocument);
  const documentLayoutResponse = useDocumentLayout(currentDocumentMeta.model);
  const plugins = useStrapiApp('RelationModalForm', (state) => state.plugins);

  const initialValues = isCreating
    ? currentDocument.getInitialFormValues(isCreating)
    : currentDocument.getInitialFormValues();

  const {
    permissions = [],
    isLoading: isLoadingPermissions,
    error,
  } = useRBAC(
    PERMISSIONS.map((action) => ({
      action,
      subject: currentDocumentMeta.model,
    }))
  );

  const isLoading =
    isLoadingPermissions || documentLayoutResponse.isLoading || currentDocument.isLoading;

  if (isLoading && !currentDocument.document?.documentId) {
    return (
      <Loader small>
        {formatMessage({
          id: 'content-manager.ListViewTable.relation-loading',
          defaultMessage: 'Relations are loading',
        })}
      </Loader>
    );
  }

  if (
    error ||
    !currentDocumentMeta.model ||
    documentLayoutResponse.error ||
    (!isCreating && !currentDocument.document) ||
    (!isCreating && !currentDocument.meta) ||
    !currentDocument.schema ||
    !initialValues
  ) {
    return (
      <Flex alignItems="center" height="100%" justifyContent="center">
        <EmptyStateLayout
          icon={<WarningCircle width="16rem" />}
          content={formatMessage({
            id: 'anErrorOccurred',
            defaultMessage: 'Whoops! Something went wrong. Please, try again.',
          })}
        />
      </Flex>
    );
  }

  const documentTitle = currentDocument.getTitle(documentLayoutResponse.edit.settings.mainField);
  const hasDraftAndPublished = currentDocument.schema?.options?.draftAndPublish ?? false;

  const props = {
    activeTab: 'draft',
    collectionType: currentDocumentMeta.collectionType,
    model: currentDocumentMeta.model,
    documentId: currentDocumentMeta.documentId,
    document: currentDocument.document,
    meta: currentDocument.meta,
  } satisfies DocumentActionProps;

  return (
    <DocumentRBAC permissions={permissions} model={currentDocumentMeta.model}>
      <Flex alignItems="flex-start" direction="column" gap={2}>
        <Flex width="100%" justifyContent="space-between" gap={2}>
          <Typography tag="h2" variant="alpha">
            {documentTitle}
          </Typography>
          <Flex gap={2}>
            <DescriptionComponentRenderer
              props={props}
              descriptions={(
                plugins['content-manager'].apis as ContentManagerPlugin['config']['apis']
              ).getDocumentActions('relation-modal')}
            >
              {(actions) => {
                const filteredActions = actions.filter((action) => {
                  return [action.position].flat().includes('relation-modal');
                });
                const [primaryAction, secondaryAction] = filteredActions;

                if (!primaryAction && !secondaryAction) return null;

                // Both actions are available when draft and publish enabled
                if (primaryAction && secondaryAction) {
                  return (
                    <>
                      {/* Save */}
                      <DocumentActionButton
                        {...secondaryAction}
                        variant={secondaryAction.variant || 'secondary'}
                      />
                      {/* Publish */}
                      <DocumentActionButton
                        {...primaryAction}
                        variant={primaryAction.variant || 'default'}
                      />
                    </>
                  );
                }

                // Otherwise we just have the save action
                return (
                  <DocumentActionButton
                    {...primaryAction}
                    variant={primaryAction.variant || 'secondary'}
                  />
                );
              }}
            </DescriptionComponentRenderer>
          </Flex>
        </Flex>
        {hasDraftAndPublished ? (
          <Box>
            <DocumentStatus status={currentDocument.document?.status} />
          </Box>
        ) : null}
      </Flex>

      <Flex flex={1} overflow="auto" alignItems="stretch" paddingTop={7}>
        <Box overflow="auto" flex={1}>
          <FormLayout
            layout={documentLayoutResponse.edit.layout}
            document={currentDocument}
            hasBackground={false}
          />
        </Box>
      </Flex>
    </DocumentRBAC>
  );
};

export { reducer, RelationModalRenderer, useRelationModal };
export type { State, Action };
