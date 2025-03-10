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
import { type DocumentMeta, useDocumentContext } from '../../../../../features/DocumentContext';
import { DocumentRBAC } from '../../../../../features/DocumentRBAC';
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

interface RelationModalContextValue {
  parentModified: boolean;
  depth: number;
}

const [RelationModalProvider, useRelationModal] = createContext<RelationModalContextValue>(
  'RelationModal',
  {
    parentModified: false,
    depth: 0,
  }
);

function useTraceUpdate(props) {
  const prev = React.useRef(props);
  React.useEffect(() => {
    const changedProps = Object.entries(props).reduce((ps, [k, v]) => {
      if (prev.current[k] !== v) {
        ps[k] = [prev.current[k], v];
      }
      return ps;
    }, {});
    if (Object.keys(changedProps).length > 0) {
      console.log('Changed props:', changedProps);
    }
    prev.current = props;
  });
}

const RelationModalWrapper = ({ relation, triggerButtonLabel }: RelationModalProps) => {
  useTraceUpdate({ relation, triggerButtonLabel });
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { formatMessage } = useIntl();

  const [triggerRefetchDocument] = useLazyGetDocumentQuery();

  const currentDocument = useDocumentContext('RelationModalBody', (state) => state.document);
  const state = useDocumentContext('RelationModalWrapper', (state) => state.state);
  const dispatch = useDocumentContext('RelationModalWrapper', (state) => state.dispatch);
  const currentDocumentMeta = useDocumentContext(
    'RelationModalWrapper',
    (state) => state.currentDocumentMeta
  );
  const rootDocumentMeta = useDocumentContext(
    'RelationModalWrapper',
    (state) => state.rootDocumentMeta
  );

  console.log('relation modal', state);
  // NOTE: Not sure about this relation modal context, maybe we should move this to DocumentContext?
  // Get parent modal context if it exists
  const parentContext = useRelationModal('RelationModalWrapper', (state) => state);
  // Get depth of nested modals
  const depth = parentContext ? parentContext.depth + 1 : 0;
  // Check if this is a nested modal
  const isNested = depth > 0;

  const getFullPageLink = (): string => {
    const isSingleType = currentDocumentMeta.collectionType === SINGLE_TYPES;
    const queryParams = currentDocumentMeta.params?.locale
      ? `?plugins[i18n][locale]=${currentDocumentMeta.params.locale}`
      : '';

    return `/content-manager/${currentDocumentMeta.collectionType}/${currentDocumentMeta.model}${isSingleType ? '' : '/' + currentDocumentMeta.documentId}${queryParams}`;
  };

  const handleConfirm = () => {
    // TODO switch case
    if (state.confirmDialogIntent === 'navigate') {
      // handleRedirection();

      const editViewUrl = `${pathname}${search}`;
      const isRootDocumentUrl = editViewUrl.includes(getFullPageLink());

      if (isRootDocumentUrl) {
        // Change back to the root document
        dispatch({
          type: 'CLOSE_MODAL',
          payload: { hasUnsavedChanges: false },
        });
        // Read from cache or refetch root document
        triggerRefetchDocument(
          rootDocumentMeta,
          // Favor the cache
          true
        );
      } else {
        navigate(getFullPageLink());
      }
    } else if (state.confirmDialogIntent === 'back') {
      if (state.documentHistory.length > 1) {
        dispatch({ type: 'GO_BACK', payload: { hasUnsavedChanges: false } });
      }
    } else if (state.confirmDialogIntent === 'open') {
      dispatch({
        type: 'GO_TO_RELATION',
        payload: { document: currentDocumentMeta, hasUnsavedChanges: false },
      });
    } else {
      // When people are trying to close the modal without saving
      dispatch({
        type: 'CLOSE_MODAL',
        payload: { hasUnsavedChanges: false },
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
          <RelationModalProvider parentModified={modified} depth={depth}>
            <Modal.Root
              open={state.isModalOpen}
              onOpenChange={(open) => {
                if (open) {
                  // do we need to do something here?
                } else {
                  dispatch({
                    type: 'CLOSE_MODAL',
                    payload: { hasUnsavedChanges },
                  });
                }
              }}
            >
              <Modal.Trigger>
                <Tooltip label={triggerButtonLabel}>
                  <CustomTextButton
                    onClick={() => {
                      const parentHasUnsavedChanges = isNested && parentContext.parentModified;

                      dispatch({
                        type: 'GO_TO_RELATION',
                        payload: {
                          document: relation,
                          hasUnsavedChanges: parentHasUnsavedChanges || hasUnsavedChanges,
                        },
                      });
                    }}
                  >
                    {triggerButtonLabel}
                  </CustomTextButton>
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
                            payload: { hasUnsavedChanges },
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
                      dispatch({ type: 'GO_FULL_PAGE', payload: { hasUnsavedChanges } });

                      // Navigation cannot happen in the reducer because it's a side effect
                      if (!hasUnsavedChanges) {
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
                  <Button
                    onClick={() => {
                      dispatch({
                        type: 'CLOSE_MODAL',
                        payload: { hasUnsavedChanges },
                      });
                    }}
                    variant="tertiary"
                  >
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                </Modal.Footer>
              </CustomModalContent>
            </Modal.Root>
            <Dialog.Root
              open={state.isConfirmDialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  dispatch({ type: 'CANCEL_CONFIRM_DIALOG' });
                }
              }}
            >
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
          </RelationModalProvider>
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

  const currentDocumentMeta = useDocumentContext(
    'RelationModalBody',
    (state) => state.currentDocumentMeta
  );
  const documentResponse = useDocumentContext('RelationModalBody', (state) => state.document);
  const documentLayoutResponse = useDocumentLayout(currentDocumentMeta.model);
  const plugins = useStrapiApp('RelationModalBody', (state) => state.plugins);

  const initialValues = documentResponse.getInitialFormValues();

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
    !currentDocumentMeta.model ||
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
    collectionType: currentDocumentMeta.collectionType,
    model: currentDocumentMeta.model,
    documentId: currentDocumentMeta.documentId,
    document: documentResponse.document,
    meta: documentResponse.meta,
  } satisfies DocumentActionProps;

  return (
    <Modal.Body>
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
              <DocumentStatus status={documentResponse.document?.status} />
            </Box>
          ) : null}
        </Flex>

        <Flex flex={1} overflow="auto" alignItems="stretch" paddingTop={7}>
          <Box overflow="auto" flex={1}>
            <FormLayout layout={documentLayoutResponse.edit.layout} hasBackground={false} />
          </Box>
        </Flex>
      </DocumentRBAC>
    </Modal.Body>
  );
};

export { RelationModalWrapper };
