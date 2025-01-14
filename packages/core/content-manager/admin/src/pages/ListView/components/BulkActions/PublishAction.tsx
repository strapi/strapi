import * as React from 'react';

import {
  useQueryParams,
  Table,
  useTable,
  getYupValidationErrors,
  FormErrors,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Typography,
  Modal,
  IconButton,
  Flex,
  Tooltip,
  Loader,
  TypographyComponent,
  Grid as GridComponent,
} from '@strapi/design-system';
import { Pencil, CrossCircle, CheckCircle, ArrowsCounterClockwise } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { ValidationError } from 'yup';

import { useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { useContentTypeSchema } from '../../../../hooks/useContentTypeSchema';
import { useDocumentActions } from '../../../../hooks/useDocumentActions';
import { useDocLayout } from '../../../../hooks/useDocumentLayout';
import { contentManagerApi } from '../../../../services/api';
import {
  useGetAllDocumentsQuery,
  usePublishManyDocumentsMutation,
} from '../../../../services/documents';
import { buildValidParams } from '../../../../utils/api';
import { getTranslation } from '../../../../utils/translations';
import { createYupSchema } from '../../../../utils/validation';
import { DocumentStatus } from '../../../EditView/components/DocumentStatus';

import { ConfirmDialogPublishAll, ConfirmDialogPublishAllProps } from './ConfirmBulkActionDialog';

import type { BulkActionComponent } from '../../../../content-manager';
import type { Document } from '../../../../hooks/useDocument';

const TypographyMaxWidth = styled<TypographyComponent>(Typography)`
  max-width: 300px;
`;

const GridRoot = styled(GridComponent.Root)`
  border-left: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-top: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

const GridItem = styled(GridComponent.Item)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral150};
  border-bottom: 1px solid ${({ theme }) => theme.colors.neutral150};
`;

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

const formatErrorMessages = (errors: FormErrors, parentKey: string, formatMessage: any) => {
  const messages: string[] = [];

  Object.entries(errors).forEach(([key, value]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if ('id' in value && 'defaultMessage' in value) {
        messages.push(
          formatMessage(
            {
              id: `${value.id}.withField`,
              defaultMessage: value.defaultMessage,
            },
            { field: currentKey }
          )
        );
      } else {
        messages.push(
          ...formatErrorMessages(
            // @ts-expect-error TODO: check why value is not compatible with FormErrors
            value,
            currentKey,
            formatMessage
          )
        );
      }
    } else {
      messages.push(
        formatMessage(
          {
            id: `${value}.withField`,
            defaultMessage: value,
          },
          { field: currentKey }
        )
      );
    }
  });

  return messages;
};

interface EntryValidationTextProps {
  validationErrors?: FormErrors;
  status: string;
}

const EntryValidationText = ({ validationErrors, status }: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = formatErrorMessages(validationErrors, '', formatMessage).join(
      ' '
    );

    return (
      <Flex gap={2}>
        <CrossCircle fill="danger600" />
        <Tooltip description={validationErrorsMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {validationErrorsMessages}
          </TypographyMaxWidth>
        </Tooltip>
      </Flex>
    );
  }

  if (status === 'published') {
    return (
      <Flex gap={2}>
        <CheckCircle fill="success600" />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'content-manager.bulk-publish.already-published',
            defaultMessage: 'Already Published',
          })}
        </Typography>
      </Flex>
    );
  }

  if (status === 'modified') {
    return (
      <Flex gap={2}>
        <ArrowsCounterClockwise fill="alternative600" />
        <Typography>
          {formatMessage({
            id: 'content-manager.bulk-publish.modified',
            defaultMessage: 'Ready to publish changes',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <CheckCircle fill="success600" />
      <Typography>
        {formatMessage({
          id: 'app.utils.ready-to-publish',
          defaultMessage: 'Ready to publish',
        })}
      </Typography>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesTableContentProps {
  isPublishing?: boolean;
  rowsToDisplay?: TableRow[];
  entriesToPublish?: TableRow['documentId'][];
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
}

const TABLE_HEADERS = [
  { name: 'id', label: 'id' },
  { name: 'name', label: 'name' },
  { name: 'status', label: 'status' },
  { name: 'publicationStatus', label: 'Publication status' },
];

const SelectedEntriesTableContent = ({
  isPublishing,
  rowsToDisplay = [],
  entriesToPublish = [],
  validationErrors = {},
}: SelectedEntriesTableContentProps) => {
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();

  const {
    list: {
      settings: { mainField },
    },
  } = useDocLayout();

  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  return (
    <Table.Content>
      <Table.Head>
        <Table.HeaderCheckboxCell />
        {TABLE_HEADERS.filter((head) => head.name !== 'name' || shouldDisplayMainField).map(
          (head) => (
            <Table.HeaderCell key={head.name} {...head} />
          )
        )}
      </Table.Head>
      <Table.Loading />
      <Table.Body>
        {rowsToDisplay.map((row, index) => (
          <Table.Row key={row.id}>
            <Table.CheckboxCell id={row.id} />
            <Table.Cell>
              <Typography>{row.id}</Typography>
            </Table.Cell>
            {shouldDisplayMainField && (
              <Table.Cell>
                <Typography>{row[mainField as keyof TableRow]}</Typography>
              </Table.Cell>
            )}
            <Table.Cell>
              <DocumentStatus status={row.status} maxWidth={'min-content'} />
            </Table.Cell>
            <Table.Cell>
              {isPublishing && entriesToPublish.includes(row.documentId) ? (
                <Flex gap={2}>
                  <Typography>
                    {formatMessage({
                      id: 'content-manager.success.record.publishing',
                      defaultMessage: 'Publishing...',
                    })}
                  </Typography>
                  <Loader small />
                </Flex>
              ) : (
                <EntryValidationText
                  validationErrors={validationErrors[row.documentId]}
                  status={row.status}
                />
              )}
            </Table.Cell>
            <Table.Cell>
              <Flex>
                <IconButton
                  tag={Link}
                  to={{
                    pathname: `${pathname}/${row.documentId}`,
                    search: row.locale && `?plugins[i18n][locale]=${row.locale}`,
                  }}
                  state={{ from: pathname }}
                  label={formatMessage({
                    id: 'content-manager.bulk-publish.edit',
                    defaultMessage: 'Edit',
                  })}
                  target="_blank"
                  marginLeft="auto"
                  variant="ghost"
                >
                  <Pencil width={'1.6rem'} height={'1.6rem'} />
                </IconButton>
              </Flex>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * PublicationStatusSummary
 * -----------------------------------------------------------------------------------------------*/

interface PublicationStatusSummaryProps {
  count: number;
  icon: React.ReactNode;
  message: string;
}

const PublicationStatusSummary = ({ count, icon, message }: PublicationStatusSummaryProps) => {
  return (
    <Flex justifyContent="space-between" flex={1} gap={3}>
      <Flex gap={2}>
        {icon}
        <Typography>{message}</Typography>
      </Flex>
      {BoldChunk(count)}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PublicationStatusGrid
 * -----------------------------------------------------------------------------------------------*/

interface PublicationStatusGridProps {
  entriesReadyToPublishCount: number;
  entriesModifiedCount: number;
  entriesPublishedCount: number;
  entriesWithErrorsCount: number;
}

const PublicationStatusGrid = ({
  entriesReadyToPublishCount,
  entriesPublishedCount,
  entriesModifiedCount,
  entriesWithErrorsCount,
}: PublicationStatusGridProps) => {
  const { formatMessage } = useIntl();

  const publicationStatuses = [
    {
      count: entriesReadyToPublishCount,
      icon: <CheckCircle fill="success600" />,
      message: formatMessage({
        id: 'app.utils.ready-to-publish',
        defaultMessage: 'Ready to publish',
      }),
    },
    {
      count: entriesPublishedCount,
      icon: <CheckCircle fill="success600" />,
      message: formatMessage({
        id: 'app.utils.already-published',
        defaultMessage: 'Already published',
      }),
    },
    {
      count: entriesModifiedCount,
      icon: <ArrowsCounterClockwise fill="alternative600" />,
      message: formatMessage({
        id: 'content-manager.bulk-publish.modified',
        defaultMessage: 'Ready to publish changes',
      }),
    },
    {
      count: entriesWithErrorsCount,
      icon: <CrossCircle fill="danger600" />,
      message: formatMessage({
        id: 'content-manager.bulk-publish.waiting-for-action',
        defaultMessage: 'Waiting for action',
      }),
    },
  ];

  return (
    <GridRoot hasRadius>
      {publicationStatuses.map((item) => (
        <GridItem key={item.message} col={6} padding={4}>
          <PublicationStatusSummary count={item.count} icon={item.icon} message={item.message} />
        </GridItem>
      ))}
    </GridRoot>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

interface TableRow extends Document {}

interface SelectedEntriesModalContentProps {
  listViewSelectedEntries: TableRow[];
  toggleModal: ConfirmDialogPublishAllProps['onToggleDialog'];
  setListViewSelectedDocuments: (documents: TableRow[]) => void;
  model: string;
}

const SelectedEntriesModalContent = ({
  listViewSelectedEntries,
  toggleModal,
  setListViewSelectedDocuments,
  model,
}: SelectedEntriesModalContentProps) => {
  const { formatMessage } = useIntl();
  const { schema, components } = useContentTypeSchema(model);
  const documentIds = listViewSelectedEntries.map(({ documentId }) => documentId);

  // We want to keep the selected entries order same as the list view
  const [{ query }] = useQueryParams<{ sort?: string; plugins?: Record<string, any> }>();
  const params = React.useMemo(() => buildValidParams(query), [query]);

  // Fetch the documents based on the selected entries and update the modal table
  const { data, isLoading, isFetching, refetch } = useGetAllDocumentsQuery(
    {
      model,
      params: {
        page: '1',
        pageSize: documentIds.length.toString(),
        sort: query.sort,
        filters: {
          documentId: {
            $in: documentIds,
          },
        },
        locale: query.plugins?.i18n?.locale,
      },
    },
    {
      selectFromResult: ({ data, ...restRes }) => ({ data: data?.results ?? [], ...restRes }),
    }
  );

  // Validate the entries based on the schema to show errors if any
  const { rows, validationErrors } = React.useMemo(() => {
    if (data.length > 0 && schema) {
      const validate = createYupSchema(
        schema.attributes,
        components,
        // Since this is the "Publish" action, the validation
        // schema must enforce the rules for published entities
        { status: 'published' }
      );
      const validationErrors: Record<TableRow['documentId'], FormErrors> = {};
      const rows = data.map((entry: Document) => {
        try {
          validate.validateSync(entry, { abortEarly: false });

          return entry;
        } catch (e) {
          if (e instanceof ValidationError) {
            validationErrors[entry.documentId] = getYupValidationErrors(e);
          }

          return entry;
        }
      });

      return { rows, validationErrors };
    }

    return {
      rows: [],
      validationErrors: {},
    };
  }, [components, data, schema]);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const { publishMany: bulkPublishAction } = useDocumentActions();
  const [, { isLoading: isSubmittingForm }] = usePublishManyDocumentsMutation();

  const selectedRows = useTable('publishAction', (state) => state.selectedRows);

  // Filter selected entries from the updated modal table rows
  const selectedEntries = rows.filter((entry) =>
    selectedRows.some((selectedEntry) => selectedEntry.documentId === entry.documentId)
  );

  const entriesToPublish = selectedEntries
    .filter((entry) => !validationErrors[entry.documentId])
    .map((entry) => entry.documentId);

  const selectedEntriesWithErrorsCount = selectedEntries.filter(
    ({ documentId }) => validationErrors[documentId]
  ).length;
  const selectedEntriesPublished = selectedEntries.filter(
    ({ status }) => status === 'published'
  ).length;
  const selectedEntriesModified = selectedEntries.filter(
    ({ status }) => status === 'modified'
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const handleConfirmBulkPublish = async () => {
    toggleDialog();

    const res = await bulkPublishAction({ model: model, documentIds: entriesToPublish, params });
    if (!('error' in res)) {
      const unpublishedEntries = rows.filter((row) => {
        return !entriesToPublish.includes(row.documentId);
      });
      // Keep selection of the entries in list view that were not published
      setListViewSelectedDocuments(unpublishedEntries);
    }
  };

  return (
    <>
      <Modal.Body>
        <PublicationStatusGrid
          entriesReadyToPublishCount={selectedEntriesWithNoErrorsCount - selectedEntriesModified}
          entriesPublishedCount={selectedEntriesPublished}
          entriesModifiedCount={selectedEntriesModified}
          entriesWithErrorsCount={selectedEntriesWithErrorsCount}
        />
        <Box marginTop={7}>
          <SelectedEntriesTableContent
            isPublishing={isSubmittingForm}
            rowsToDisplay={rows}
            entriesToPublish={entriesToPublish}
            validationErrors={validationErrors}
          />
        </Box>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={toggleModal} variant="tertiary">
          {formatMessage({
            id: 'app.components.Button.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
        <Flex gap={2}>
          <Button onClick={refetch} variant="tertiary" loading={isFetching}>
            {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
          </Button>
          <Button
            onClick={toggleDialog}
            disabled={
              selectedEntries.length === 0 ||
              selectedEntries.length === selectedEntriesWithErrorsCount ||
              selectedEntriesPublished === selectedEntries.length ||
              isLoading
            }
            loading={isSubmittingForm}
          >
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
        </Flex>
      </Modal.Footer>
      <ConfirmDialogPublishAll
        isOpen={isDialogOpen}
        onToggleDialog={toggleDialog}
        isConfirmButtonLoading={isSubmittingForm}
        onConfirm={handleConfirmBulkPublish}
      />
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PublishAction
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: BulkActionComponent = ({ documents, model }) => {
  const { formatMessage } = useIntl();
  // Publish button visibility
  const hasPublishPermission = useDocumentRBAC('unpublishAction', (state) => state.canPublish);
  const showPublishButton =
    hasPublishPermission && documents.some(({ status }) => status !== 'published');

  const setListViewSelectedDocuments = useTable('publishAction', (state) => state.selectRow);

  const refetchList = () => {
    contentManagerApi.util.invalidateTags([{ type: 'Document', id: `${model}_LIST` }]);
  };

  if (!showPublishButton) return null;

  return {
    actionType: 'publish',
    variant: 'tertiary',
    label: formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' }),
    dialog: {
      type: 'modal',
      title: formatMessage({
        id: getTranslation('containers.ListPage.selectedEntriesModal.title'),
        defaultMessage: 'Publish entries',
      }),
      content: ({ onClose }) => {
        return (
          <Table.Root rows={documents} defaultSelectedRows={documents} headers={TABLE_HEADERS}>
            <SelectedEntriesModalContent
              listViewSelectedEntries={documents}
              toggleModal={() => {
                onClose();
                refetchList();
              }}
              setListViewSelectedDocuments={setListViewSelectedDocuments}
              model={model}
            />
          </Table.Root>
        );
      },
      onClose: () => {
        refetchList();
      },
    },
  };
};

export { PublishAction, SelectedEntriesModalContent };
