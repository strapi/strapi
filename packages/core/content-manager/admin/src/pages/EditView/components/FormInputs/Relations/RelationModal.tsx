import * as React from 'react';

import { Form as FormContext, useRBAC } from '@strapi/admin/strapi-admin';
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
import { DocumentRBAC } from '../../../../../features/DocumentRBAC';
import { useDocument } from '../../../../../hooks/useDocument';
import { useDocumentLayout } from '../../../../../hooks/useDocumentLayout';
import { useRelationContext } from '../../../EditViewPage';
import { DocumentStatus } from '../../DocumentStatus';
import { FormLayout } from '../../FormLayout';

interface RelationModalProps {
  open: boolean;
  onToggle: () => void;
  id?: string;
  model: string;
  relationUrl: string;
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

const RelationModal = ({ open, onToggle, id, model, relationUrl }: RelationModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root open={open} onOpenChange={onToggle}>
      <CustomModalContent>
        <Modal.Header>
          <Flex>
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
        </Modal.Header>
        <RelationModalBody
          id={id}
          model={model}
          collectionType={getCollectionType(relationUrl)!}
          isModalOpen={open}
          onToggleModal={onToggle}
        />
        <Modal.Footer>
          <Button onClick={onToggle} variant="tertiary">
            {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
          </Button>
        </Modal.Footer>
      </CustomModalContent>
    </Modal.Root>
  );
};

interface RelationModalBodyProps {
  model: string;
  id?: string;
  collectionType: string;
  isModalOpen: boolean;
  onToggleModal: () => void;
}

const RelationModalBody = ({ id }: RelationModalBodyProps) => {
  const { formatMessage } = useIntl();
  const currentRelation = useRelationContext('RelationContext', (state) => state.currentRelation);
  const documentResponse = useRelationContext('RelationContext', (state) => state.document);
  const documentLayoutResponse = useRelationContext(
    'RelationContext',
    (state) => state.documentLayout
  );

  const initialValues = documentResponse.getInitialFormValues();

  const {
    permissions = [],
    isLoading,
    error,
  } = useRBAC(
    PERMISSIONS.map((action) => ({
      action,
      subject: currentRelation.model,
    }))
  );

  if (isLoading || documentResponse.isLoading || documentLayoutResponse.isLoading) {
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
    !currentRelation.model ||
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

  return (
    <Modal.Body>
      <DocumentRBAC permissions={permissions} model={currentRelation.model}>
        <Flex direction="column" alignItems="flex-start" gap={2}>
          <Typography tag="h2" variant="alpha">
            {documentTitle}
          </Typography>
          {hasDraftAndPublished ? (
            <Box marginTop={1}>
              <DocumentStatus status={documentResponse.document?.status} />
            </Box>
          ) : null}
        </Flex>
        <FormContext initialValues={initialValues} method={id ? 'PUT' : 'POST'}>
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
