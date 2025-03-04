import * as React from 'react';

import {
  ConfirmDialog,
  DescriptionComponentRenderer,
  Form as FormContext,
  useRBAC,
  useStrapiApp,
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
import { useDocumentContext } from '../../../../../features/DocumentContext';
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
  newDocument: {
    documentId: string;
    model: string;
    collectionType: string;
    params: Record<string, string | null>;
  };
  setIsConfirmationOpen: (isOpen: boolean) => void;
  setOnConfirm: (onConfirm: () => void) => void;
  open?: boolean;
  onToggle: () => void;
  setIsModalOpen: (isOpen: boolean) => void;
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

type RelationModalWrapperProps = Omit<
  RelationModalProps,
  | 'setOnConfirm'
  | 'setIsConfirmationOpen'
  | 'isFormModified'
  | 'open'
  | 'onToggle'
  | 'setIsModalOpen'
>;

const RelationModalWrapper = ({ newDocument, triggerButtonLabel }: RelationModalWrapperProps) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [triggerRefetchDocument] = useLazyGetDocumentQuery();
  const { formatMessage } = useIntl();
  const documentResponse = useDocumentContext('RelationModalBody', (state) => state.document);
  const rootDocumentMeta = useDocumentContext(
    'RelationModalBody',
    (state) => state.rootDocumentMeta
  );
  const documentMeta = useDocumentContext('RelationModalBody', (state) => state.meta);
  const changeDocument = useDocumentContext('RelationModalBody', (state) => state.changeDocument);
  const [isConfirmationOpen, setIsConfirmationOpen] = React.useState<boolean>(false);
  // handler for the confirmation dialog to be used when we confirm the choice
  const [confirmationDialogPosition, setConfirmationDialogPosition] = React.useState<
    'cancel' | 'navigate' | 'changeDocument'
  >();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const initialValues = documentResponse.getInitialFormValues();

  const handleToggleModal = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
      const document = {
        collectionType: rootDocumentMeta.collectionType,
        model: rootDocumentMeta.model,
        documentId: rootDocumentMeta.documentId,
      };
      // Change back to the root document
      changeDocument(document);
      // Read from cache or refetch root document
      triggerRefetchDocument(
        document,
        // Favor the cache
        true
      );
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = (isFormModified: boolean) => {
    if (isFormModified) {
      setIsConfirmationOpen(true);
    } else {
      handleToggleModal();
    }
  };

  const handleChangeModalContent = () => {
    changeDocument(newDocument);
  };

  const getFullPageLink = (): string => {
    const isSingleType = documentMeta.collectionType === SINGLE_TYPES;
    const queryParams = documentMeta.params?.locale
      ? `?plugins[i18n][locale]=${documentMeta.params.locale}`
      : '';

    return `/content-manager/${documentMeta.collectionType}/${documentMeta.model}${isSingleType ? '' : '/' + documentMeta.documentId}${queryParams}`;
  };

  const editViewUrl = `${pathname}${search}`;
  const modalDocumentUrlEqualEditViewUrl = editViewUrl.includes(getFullPageLink());
  const handleRedirection = () => {
    if (modalDocumentUrlEqualEditViewUrl) {
      handleToggleModal();
    } else {
      navigate(getFullPageLink());
    }
  };

  const handleConfirm = () => {
    switch (confirmationDialogPosition) {
      case 'cancel':
        handleToggleModal();
        break;
      case 'navigate':
        handleRedirection();
        break;
      case 'changeDocument':
        handleChangeModalContent();
        break;
      default:
        handleToggleModal();
    }
  };

  return (
    <FormContext
      method="PUT"
      initialValues={initialValues}
      validate={(values: Record<string, unknown>, options: Record<string, string>) => {
        const yupSchema = createYupSchema(
          documentResponse.schema?.attributes,
          documentResponse.components,
          {
            status: documentResponse.document?.status,
            ...options,
          }
        );

        return yupSchema.validate(values, { abortEarly: false });
      }}
    >
      {({ modified, isSubmitting }) => {
        return (
          <>
            <Modal.Root
              open={isModalOpen}
              onOpenChange={() => {
                if (isModalOpen) {
                  setConfirmationDialogPosition('cancel');
                  if (modified && !isSubmitting) {
                    setIsConfirmationOpen(true);
                  } else {
                    handleToggleModal();
                  }
                }
              }}
            >
              <Modal.Trigger>
                <Tooltip description={triggerButtonLabel}>
                  <CustomTextButton
                    onClick={() => {
                      setConfirmationDialogPosition('changeDocument');
                      if (modified && !isSubmitting) {
                        setIsConfirmationOpen(true);
                      } else {
                        handleChangeModalContent();
                      }

                      if (!isModalOpen) {
                        setIsModalOpen(true);
                      }
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
                        label="Back"
                        variant="ghost"
                        disabled
                        onClick={() => {}}
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
                      setConfirmationDialogPosition('navigate');

                      if (modified && !isSubmitting) {
                        setIsConfirmationOpen(true);
                      } else {
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
                      setConfirmationDialogPosition('cancel');
                      if (modified && !isSubmitting) {
                        setIsConfirmationOpen(true);
                      } else {
                        handleToggleModal();
                      }
                    }}
                    variant="tertiary"
                  >
                    {formatMessage({
                      id: 'app.components.Button.cancel',
                      defaultMessage: 'Cancel',
                    })}
                  </Button>
                </Modal.Footer>
                <Dialog.Root open={isConfirmationOpen}>
                  <ConfirmDialog
                    onConfirm={() => {
                      handleConfirm();
                      setIsConfirmationOpen(false);
                    }}
                    onCancel={() => {
                      setIsConfirmationOpen(false);
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
              </CustomModalContent>
            </Modal.Root>
          </>
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
  children: React.ReactNode;
}

const RelationModalBody = ({ children }: RelationModalBodyProps) => {
  const { formatMessage } = useIntl();

  const documentMeta = useDocumentContext('RelationModalBody', (state) => state.meta);
  const documentResponse = useDocumentContext('RelationModalBody', (state) => state.document);
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
            <FormLayout layout={documentLayoutResponse.edit.layout} hasBackground={false} />
          </Box>
        </Flex>
      </DocumentRBAC>
    </Modal.Body>
  );
};

export { RelationModalWrapper };
