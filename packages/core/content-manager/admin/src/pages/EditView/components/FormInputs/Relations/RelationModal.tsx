import * as React from 'react';

import {
  ConfirmDialog,
  DescriptionComponentRenderer,
  Form as FormContext,
  useRBAC,
  useStrapiApp,
  createContext,
  useForm,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
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
import { type DocumentMeta, useDocumentContext } from '../../../../../features/DocumentContext';
import { DocumentRBAC } from '../../../../../features/DocumentRBAC';
import { useDoc, useDocument, type UseDocument } from '../../../../../hooks/useDocument';
import { useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import { useLazyGetDocumentQuery } from '../../../../../services/documents';
import { createYupSchema } from '../../../../../utils/validation';
import { DocumentActionButton } from '../../../components/DocumentActions';
import { DocumentStatus } from '../../DocumentStatus';
import { FormLayout } from '../../FormLayout';

import type { ContentManagerPlugin, DocumentActionProps } from '../../../../../content-manager';

interface RelationModalProps {
  triggerButtonLabel: string;
  relation: DocumentMeta;
}

export function getCollectionType(url: string) {
  const regex = new RegExp(`(${COLLECTION_TYPES}|${SINGLE_TYPES})`);
  const match = url.match(regex);
  return match ? match[1] : undefined;
}

const CustomModalContent = styled(Modal.Content)`
  width: 90%;
  max-width: 100%;
  height: 90%;
  max-height: 100%;
`;

/* -------------------------------------------------------------------------------------------------
 * RelationContextWrapper
 * -----------------------------------------------------------------------------------------------*/

interface State {
  documentHistory: DocumentMeta[];
  confirmDialogIntent: null | 'close' | 'back' | 'open' | 'navigate';
  isModalOpen: boolean;
  hasUnsavedChanges: boolean;
}

type Action =
  | {
      type: 'GO_TO_RELATION';
      payload: {
        document: DocumentMeta;
        shouldBypassConfirmation: boolean;
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
        return { ...state, confirmDialogIntent: 'open' };
      }

      return {
        ...state,
        documentHistory: [...state.documentHistory, action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
      };
    case 'GO_BACK':
      if (state.hasUnsavedChanges && !action.payload.shouldBypassConfirmation) {
        return { ...state, confirmDialogIntent: 'back' };
      }

      return {
        ...state,
        documentHistory: state.documentHistory.slice(0, state.documentHistory.length - 1),
        confirmDialogIntent: null,
      };
    case 'GO_FULL_PAGE':
      if (state.hasUnsavedChanges) {
        return { ...state, confirmDialogIntent: 'navigate' };
      }

      return {
        ...state,
        confirmDialogIntent: null,
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
}

const [RelationModalProvider, useRelationModal] =
  createContext<RelationModalContextValue>('RelationModal');

const FormWatcher = () => {
  const modified = useForm('FormWatcher', (state) => state.modified);
  const isSubmitting = useForm('FormWatcher', (state) => state.isSubmitting);

  const dispatch = useRelationModal('FormWatcher', (state) => state.dispatch);
  const hasUnsavedChanges = modified && !isSubmitting;

  React.useEffect(() => {
    dispatch({ type: 'SET_HAS_UNSAVED_CHANGES', payload: { hasUnsavedChanges } });
  }, [hasUnsavedChanges, dispatch]);

  return null;
};

const RelationRenderer = ({
  children,
  trigger,
  relation,
}: {
  children: React.ReactNode;
  trigger: React.ReactNode;
  relation: RelationModalProps['relation'];
}) => {
  const { formatMessage } = useIntl();

  const rootDocument = useDoc();

  const [state, dispatch] = React.useReducer(reducer, {
    documentHistory: [],
    confirmDialogIntent: null,
    isModalOpen: false,
    hasUnsavedChanges: false,
  });

  if (!rootDocument.document) {
    throw new Error('Root document not found');
  }

  const rootDocumentId = rootDocument.document.documentId;
  const rootDocumentMeta: DocumentMeta = React.useMemo(
    () => ({
      documentId: rootDocumentId,
      model: rootDocument.model,
      collectionType: rootDocument.collectionType,
    }),
    [rootDocument.collectionType, rootDocumentId, rootDocument.model]
  );

  const currentDocumentMeta = state.documentHistory.at(-1) ?? rootDocumentMeta;

  const params = React.useMemo(
    () => buildValidParams(currentDocumentMeta.params ?? {}),
    [currentDocumentMeta.params]
  );
  const currentDocument = useDocument({ ...currentDocumentMeta, params });

  const parentContextValue = useRelationModal('RelationContextWrapper', (state) => state, false);

  // A parent relation is already rendering a modal. In this case simply render the trigger
  if (parentContextValue) {
    return trigger;
  }

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
    >
      <Modal.Root
        open={state.isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            dispatch({
              type: 'GO_TO_RELATION',
              // NOTE: the document used to be currentDocumentMeta
              payload: { document: relation, shouldBypassConfirmation: false },
            });
          } else {
            dispatch({
              type: 'CLOSE_MODAL',
              payload: { shouldBypassConfirmation: false },
            });
          }
        }}
      >
        <FormContext
          method="PUT"
          initialValues={currentDocument.getInitialFormValues()}
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
          <FormWatcher />
          {trigger}
          <CustomModalContent>
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
                    {formatMessage({
                      id: 'content-manager.components.RelationInputModal.modal-title',
                      defaultMessage: 'Edit a relation',
                    })}
                  </Typography>
                </Flex>
              </Flex>
            </Modal.Header>
            <Modal.Body>{children}</Modal.Body>
            <Modal.Footer>
              <Modal.Close>
                <Button variant="tertiary">
                  {formatMessage({
                    id: 'app.components.Button.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
              </Modal.Close>
            </Modal.Footer>
          </CustomModalContent>
        </FormContext>
      </Modal.Root>
    </RelationModalProvider>
  );
};

const RelationCardInner = ({ relation }: RelationModalProps) => {
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

  const getFullPageLink = (): string => {
    const isSingleType = currentDocumentMeta.collectionType === SINGLE_TYPES;
    const queryParams = currentDocumentMeta.params?.locale
      ? `?plugins[i18n][locale]=${currentDocumentMeta.params.locale}`
      : '';

    return `/content-manager/${currentDocumentMeta.collectionType}/${currentDocumentMeta.model}${isSingleType ? '' : '/' + currentDocumentMeta.documentId}${queryParams}`;
  };

  const handleRedirection = () => {
    const editViewUrl = `${pathname}${search}`;
    const isRootDocumentUrl = editViewUrl.includes(getFullPageLink());

    if (isRootDocumentUrl) {
      handleCloseModal(true);
    } else {
      navigate(getFullPageLink());
    }
  };

  const handleConfirm = () => {
    if (state.confirmDialogIntent === 'navigate') {
      handleRedirection();
    } else if (state.confirmDialogIntent === 'back') {
      dispatch({ type: 'GO_BACK', payload: { shouldBypassConfirmation: true } });
    } else if (state.confirmDialogIntent === 'close') {
      handleCloseModal(true);
    } else if (state.confirmDialogIntent === 'open') {
      dispatch({
        type: 'GO_TO_RELATION',
        payload: { document: relation, shouldBypassConfirmation: true },
      });
    }
  };

  return (
    <>
      <RelationEditView>
        <IconButton
          onClick={() => {
            dispatch({
              type: 'GO_FULL_PAGE',
            });
            if (!state.hasUnsavedChanges) {
              navigate(getFullPageLink());
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
      </RelationEditView>
      <Dialog.Root open={state.confirmDialogIntent != null}>
        <ConfirmDialog
          onConfirm={() => {
            handleConfirm();
            // TODO: fix scope
            // resetForm();
          }}
          onCancel={() => {
            dispatch({ type: 'CANCEL_CONFIRM_DIALOG' });
          }}
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

const ModalTrigger = ({
  children,
  relation,
}: {
  children: React.ReactNode;
  relation: DocumentMeta;
}) => {
  const dispatch = useRelationModal('ModalTrigger', (state) => state.dispatch);

  return (
    <CustomTextButton
      onClick={() => {
        dispatch({
          type: 'GO_TO_RELATION',
          payload: { document: relation, shouldBypassConfirmation: false },
        });
      }}
    >
      {children}
    </CustomTextButton>
  );
};

const RelationCard = React.memo((props: RelationModalProps) => {
  return (
    <RelationRenderer
      relation={props.relation}
      trigger={<ModalTrigger relation={props.relation}>{props.triggerButtonLabel}</ModalTrigger>}
    >
      <RelationCardInner {...props} />
    </RelationRenderer>
  );
});

const CustomTextButton = styled(TextButton)`
  & > span {
    font-size: ${({ theme }) => theme.fontSizes[2]};
  }
`;

/**
 * The mini edit view for a relation that is displayed inside a modal.
 * It's complete with its header, document actions and form layout.
 */
const RelationEditView = ({ children }: { children: React.ReactNode }) => {
  const { formatMessage } = useIntl();

  const currentDocumentMeta = useRelationModal(
    'RelationModalBody',
    (state) => state.currentDocumentMeta
  );
  const currentDocument = useRelationModal('RelationModalBody', (state) => state.currentDocument);
  const onPreview = useDocumentContext('RelationModalBody', (state) => state.onPreview);
  const documentLayoutResponse = useDocumentLayout(currentDocumentMeta.model);
  const plugins = useStrapiApp('RelationModalBody', (state) => state.plugins);

  const initialValues = currentDocument.getInitialFormValues();

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
    !currentDocument.document ||
    !currentDocument.meta ||
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
    onPreview,
  } satisfies DocumentActionProps;

  return (
    <DocumentRBAC permissions={permissions} model={currentDocumentMeta.model}>
      <Flex alignItems="flex-start" direction="column" gap={2}>
        <Flex width="100%" justifyContent="space-between" gap={2}>
          <Typography tag="h2" variant="alpha">
            {documentTitle}
          </Typography>
          <Flex gap={2}>
            {children}
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

export { RelationCard };
