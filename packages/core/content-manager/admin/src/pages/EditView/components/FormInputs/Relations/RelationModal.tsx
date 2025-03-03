import * as React from 'react';

import {
  DescriptionComponentRenderer,
  Form as FormContext,
  useRBAC,
  useStrapiApp,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  EmptyStateLayout,
  Flex,
  IconButton,
  Loader,
  Modal,
  Typography,
} from '@strapi/design-system';
import { ArrowLeft, WarningCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { COLLECTION_TYPES, SINGLE_TYPES } from '../../../../../constants/collections';
import { PERMISSIONS } from '../../../../../constants/plugin';
import { useDocumentContext } from '../../../../../features/DocumentContext';
import { DocumentRBAC } from '../../../../../features/DocumentRBAC';
import { useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import { createYupSchema } from '../../../../../utils/validation';
import { DocumentActionButton } from '../../../components/DocumentActions';
import { DocumentStatus } from '../../DocumentStatus';
import { FormLayout } from '../../FormLayout';

import type { ContentManagerPlugin, DocumentActionProps } from '../../../../../content-manager';

interface RelationModalProps {
  open: boolean;
  onToggle: () => void;
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

const RelationModal = ({ open, onToggle }: RelationModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onToggle}>
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
        <RelationModalBody />
        <Modal.Footer>
          <Button onClick={onToggle} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Modal.Footer>
      </CustomModalContent>
    </Modal.Root>
  );
};

const RelationModalBody = () => {
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
        <FormContext
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
          method="PUT"
        >
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
                <DocumentStatus status={documentResponse.document?.status} />
              </Box>
            ) : null}
          </Flex>

          <Flex flex={1} overflow="auto" alignItems="stretch" paddingTop={7}>
            <Box overflow="auto" flex={1}>
              <FormLayout layout={documentLayoutResponse.edit.layout} hasBackground={false} />
            </Box>
          </Flex>
        </FormContext>
      </DocumentRBAC>
    </Modal.Body>
  );
};

export { RelationModal };
