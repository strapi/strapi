import * as React from 'react';

import {
  ConfirmDialog,
  DescriptionComponentRenderer,
  Form as FormContext,
  useRBAC,
  useStrapiApp,
  createContext,
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
  Tooltip,
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
}

type Action =
  | {
      type: 'GO_TO_RELATION';
      payload: {
        document: DocumentMeta;
        // TODO: rename something like shouldAskConfirmation
        shouldAskConfirmation: boolean;
      };
    }
  | {
      type: 'GO_BACK';
      payload: { shouldAskConfirmation: boolean };
    }
  | {
      type: 'GO_FULL_PAGE';
      payload: { shouldAskConfirmation: boolean };
    }
  | {
      type: 'CANCEL_CONFIRM_DIALOG';
    }
  | {
      type: 'CLOSE_MODAL';
      payload: { shouldAskConfirmation: boolean };
    };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'GO_TO_RELATION':
      if (action.payload.shouldAskConfirmation) {
        return { ...state, confirmDialogIntent: 'open' };
      }

      return {
        ...state,
        documentHistory: [...state.documentHistory, action.payload.document],
        confirmDialogIntent: null,
        isModalOpen: true,
      };
    case 'GO_BACK':
      if (action.payload.shouldAskConfirmation) {
        return { ...state, confirmDialogIntent: 'back' };
      }

      return {
        ...state,
        documentHistory: state.documentHistory.slice(0, state.documentHistory.length - 1),
        confirmDialogIntent: null,
      };
    case 'GO_FULL_PAGE':
      if (action.payload.shouldAskConfirmation) {
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
      if (action.payload.shouldAskConfirmation) {
        return { ...state, confirmDialogIntent: 'close' };
      }

      return {
        ...state,
        documentHistory: [],
        confirmDialogIntent: null,
        isModalOpen: false,
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

const RelationContextWrapper = ({ children }: { children: React.ReactNode }) => {
  const rootDocument = useDoc();

  const [state, dispatch] = React.useReducer(reducer, {
    documentHistory: [],
    confirmDialogIntent: null,
    isModalOpen: false,
  });

  if (!rootDocument.document) {
    throw new Error('Root document not found');
  }

  // TODO: Return children directly if the context is already in the tree

  const rootDocumentMeta: DocumentMeta = {
    documentId: rootDocument.document.documentId,
    model: rootDocument.model,
    collectionType: rootDocument.collectionType,
  };

  const currentDocumentMeta = state.documentHistory.at(-1) ?? rootDocumentMeta;

  const params = React.useMemo(
    () => buildValidParams(currentDocumentMeta.params ?? {}),
    [currentDocumentMeta.params]
  );
  const currentDocument = useDocument({ ...currentDocumentMeta, params });

  return (
    <RelationModalProvider
      rootDocumentMeta={rootDocumentMeta}
      state={state}
      dispatch={dispatch}
      currentDocumentMeta={currentDocumentMeta}
      currentDocument={currentDocument}
    >
      {children}
    </RelationModalProvider>
  );
};

const RelationModalForm = ({ relation, triggerButtonLabel }: RelationModalProps) => {
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
  const currentDocument = useRelationModal('RelationModalForm', (state) => state.currentDocument);

  const handleCloseModal = (hasUnsavedChanges: boolean) => {
    if (hasUnsavedChanges) {
      dispatch({ type: 'CLOSE_MODAL', payload: { shouldAskConfirmation: true } });
    } else {
      dispatch({ type: 'CLOSE_MODAL', payload: { shouldAskConfirmation: false } });
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
      handleCloseModal(false);
    } else {
      navigate(getFullPageLink());
    }
  };

  const handleConfirm = () => {
    if (state.confirmDialogIntent === 'navigate') {
      handleRedirection();
    } else if (state.confirmDialogIntent === 'back') {
      dispatch({ type: 'GO_BACK', payload: { shouldAskConfirmation: false } });
    } else if (state.confirmDialogIntent === 'close') {
      handleCloseModal(false);
    } else if (state.confirmDialogIntent === 'open') {
      dispatch({
        type: 'GO_TO_RELATION',
        payload: { document: relation, shouldAskConfirmation: false },
      });
    }
  };

  return (
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
      {({ modified, isSubmitting, resetForm }) => {
        // We don't count the root document, so history starts after 1
        const hasHistory = state.documentHistory.length > 1;
        const hasUnsavedChanges = modified && !isSubmitting;

        return (
          <RelationContextWrapper>
            <Modal.Root
              open={state.isModalOpen}
              onOpenChange={(open) => {
                if (open) {
                  dispatch({
                    type: 'GO_TO_RELATION',
                    // NOTE: the document used to be currentDocumentMeta
                    payload: { document: relation, shouldAskConfirmation: hasUnsavedChanges },
                  });
                } else {
                  dispatch({
                    type: 'CLOSE_MODAL',
                    payload: { shouldAskConfirmation: hasUnsavedChanges },
                  });
                }
              }}
            >
              <Modal.Trigger>
                <Tooltip label={triggerButtonLabel}>
                  <CustomTextButton>{triggerButtonLabel}</CustomTextButton>
                </Tooltip>
              </Modal.Trigger>
              <CustomModalContent>
                <Modal.Header gap={2}>
                  <Flex justifyContent="space-between" alignItems="center" width="100%">
                    <Flex gap={2}>
                      <IconButton
                        withTooltip={false}
                        label={formatMessage({ id: 'global.back', defaultMessage: 'Back' })}
                        variant="ghost"
                        disabled={!hasHistory}
                        onClick={() => {
                          dispatch({
                            type: 'GO_BACK',
                            payload: { shouldAskConfirmation: hasUnsavedChanges },
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
                <RelationModalBody>
                  <IconButton
                    onClick={() => {
                      if (hasUnsavedChanges) {
                        dispatch({
                          type: 'GO_FULL_PAGE',
                          payload: { shouldAskConfirmation: true },
                        });
                      } else {
                        dispatch({
                          type: 'GO_FULL_PAGE',
                          payload: { shouldAskConfirmation: false },
                        });
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
                </RelationModalBody>
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
            </Modal.Root>
            <Dialog.Root open={state.confirmDialogIntent != null}>
              <ConfirmDialog
                onConfirm={() => {
                  handleConfirm();
                  resetForm();
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
          </RelationContextWrapper>
        );
      }}
    </FormContext>
  );
};

const CustomTextButton = styled(TextButton)`
  & > span {
    font-size: ${({ theme }) => theme.fontSizes[2]};
  }
`;

interface RelationModalBodyProps {
  /**
   * Additional modal actions such as "Open in full page"
   */
  children: React.ReactNode;
}

const RelationModalBody = ({ children }: RelationModalBodyProps) => {
  const { formatMessage } = useIntl();

  const documentMeta = useDocumentContext('RelationModalBody', (state) => state.meta);
  const documentResponse = useDocumentContext('RelationModalBody', (state) => state.document);
  const onPreview = useDocumentContext('RelationModalBody', (state) => state.onPreview);
  const documentLayoutResponse = useDocumentLayout(documentMeta.model);
  const plugins = useStrapiApp('RelationModalBody', (state) => state.plugins);

  const initialValues = documentResponse.getInitialFormValues();

  const {
    permissions = [],
    isLoading: isLoadingPermissions,
    error,
  } = useRBAC(
    PERMISSIONS.map((action) => ({
      action,
      subject: documentMeta.model,
    }))
  );

  const isLoading =
    isLoadingPermissions || documentLayoutResponse.isLoading || documentResponse.isLoading;
  if (isLoading && !documentResponse.document?.documentId) {
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
    !documentMeta.model ||
    documentLayoutResponse.error ||
    !documentResponse.document ||
    !documentResponse.meta ||
    !documentResponse.schema ||
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

  const documentTitle = documentResponse.getTitle(documentLayoutResponse.edit.settings.mainField);
  const hasDraftAndPublished = documentResponse.schema?.options?.draftAndPublish ?? false;

  const props = {
    activeTab: 'draft',
    collectionType: documentMeta.collectionType,
    model: documentMeta.model,
    documentId: documentMeta.documentId,
    document: documentResponse.document,
    meta: documentResponse.meta,
    onPreview,
  } satisfies DocumentActionProps;

  return (
    <Modal.Body>
      <DocumentRBAC permissions={permissions} model={documentMeta.model}>
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
              <DocumentStatus status={documentResponse.document?.status} />
            </Box>
          ) : null}
        </Flex>

        <Flex flex={1} overflow="auto" alignItems="stretch" paddingTop={7}>
          <Box overflow="auto" flex={1}>
            <FormLayout
              layout={documentLayoutResponse.edit.layout}
              document={documentResponse}
              hasBackground={false}
            />
          </Box>
        </Flex>
      </DocumentRBAC>
    </Modal.Body>
  );
};

export { RelationModalForm };
