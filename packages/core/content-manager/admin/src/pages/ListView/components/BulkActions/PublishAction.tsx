import * as React from 'react';

import { useQueryParams, Table, useTable } from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Typography,
  ModalBody,
  ModalFooter,
  IconButton,
  Flex,
  Tooltip,
  Loader,
  TypographyComponent,
} from '@strapi/design-system';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { ValidationError } from 'yup';

import { useDocumentRBAC } from '../../../../features/DocumentRBAC';
import { useDoc, type Document } from '../../../../hooks/useDocument';
import { useDocumentActions } from '../../../../hooks/useDocumentActions';
import { useDocLayout } from '../../../../hooks/useDocumentLayout';
import { contentManagerApi } from '../../../../services/api';
import {
  useGetAllDocumentsQuery,
  usePublishManyDocumentsMutation,
} from '../../../../services/documents';
import { buildValidParams } from '../../../../utils/api';
import { getTranslation } from '../../../../utils/translations';
import { getInnerErrors, createYupSchema } from '../../../../utils/validation';
import { DocumentStatus } from '../../../EditView/components/DocumentStatus';

import { ConfirmDialogPublishAll, ConfirmDialogPublishAllProps } from './ConfirmBulkActionDialog';

import type { BulkActionComponent } from '../../../../content-manager';

const TypographyMaxWidth = styled<TypographyComponent>(Typography)`
  max-width: 300px;
`;

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

interface EntryValidationTextProps {
  validationErrors?: Record<string, MessageDescriptor>;
  isPublished?: boolean;
}

const EntryValidationText = ({
  validationErrors,
  isPublished = false,
}: EntryValidationTextProps) => {
  const { formatMessage } = useIntl();

  if (validationErrors) {
    const validationErrorsMessages = Object.entries(validationErrors)
      .map(([key, value]) =>
        formatMessage(
          { id: `${value.id}.withField`, defaultMessage: value.defaultMessage },
          { field: key }
        )
      )
      .join(' ');

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

  if (isPublished) {
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
                  isPublished={row.publishedAt !== null}
                />
              )}
            </Table.Cell>
            <Table.Cell>
              <IconButton
                tag={Link}
                to={{
                  pathname: `${pathname}/${row.documentId}`,
                  search: row.locale && `?plugins[i18n][locale]=${row.locale}`,
                }}
                state={{ from: pathname }}
                label={formatMessage(
                  { id: 'app.component.HelperPluginTable.edit', defaultMessage: 'Edit {target}' },
                  {
                    target: formatMessage(
                      {
                        id: 'content-manager.components.ListViewHelperPluginTable.row-line',
                        defaultMessage: 'item line {number}',
                      },
                      { number: index + 1 }
                    ),
                  }
                )}
                noBorder
                target="_blank"
                marginLeft="auto"
              >
                <Pencil />
              </IconButton>
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
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

interface TableRow extends Document {}

interface SelectedEntriesModalContentProps
  extends Pick<SelectedEntriesTableContentProps, 'validationErrors'> {
  refetchModalData: () => void;
  setSelectedDocuments: (documents: TableRow[]) => void;
  toggleModal: ConfirmDialogPublishAllProps['onToggleDialog'];
  isFetching: boolean;
}

const SelectedEntriesModalContent = ({
  toggleModal,
  refetchModalData,
  setSelectedDocuments,
  isFetching,
  validationErrors = {},
}: SelectedEntriesModalContentProps) => {
  const { formatMessage } = useIntl();
  const {
    selectedRows: selectedEntries,
    rows,
    isLoading,
  } = useTable('SelectedEntriesModal', (state) => state);
  const [publishedCount, setPublishedCount] = React.useState(0);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const { model } = useDoc();
  const [{ query }] = useQueryParams();
  const params = React.useMemo(() => buildValidParams(query), [query]);
  const { publishMany: bulkPublishAction } = useDocumentActions();
  const [, { isLoading: isSubmittingForm }] = usePublishManyDocumentsMutation();

  const entriesToPublish = selectedEntries.reduce((acc, entry) => {
    if (!validationErrors[entry.documentId]) {
      acc.push(entry.documentId);
    }

    return acc;
  }, []);

  const selectedEntriesWithErrorsCount = selectedEntries.filter(
    ({ documentId }) => validationErrors[documentId]
  ).length;
  const selectedEntriesPublished = selectedEntries.filter(
    ({ publishedAt }) => !!publishedAt
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const handleConfirmBulkPublish = async () => {
    toggleDialog();

    const res = await bulkPublishAction({ model: model, documentIds: entriesToPublish, params });
    if (!('error' in res)) {
      // @ts-expect-error TODO: check with BE why response is not consistent with other actions
      setPublishedCount(res.count);

      const unpublishedEntries = rows.filter((row) => {
        return !entriesToPublish.includes(row.documentId);
      });
      // Keep selection of the entries in list view that were not published
      setSelectedDocuments(unpublishedEntries);
    }
  };

  const getFormattedCountMessage = () => {
    if (publishedCount) {
      return formatMessage(
        {
          id: getTranslation('containers.list.selectedEntriesModal.publishedCount'),
          defaultMessage:
            '<b>{publishedCount}</b> {publishedCount, plural, =0 {entries} one {entry} other {entries}} published. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
        },
        {
          publishedCount,
          withErrorsCount: selectedEntriesWithErrorsCount,
          b: BoldChunk,
        }
      );
    }

    return formatMessage(
      {
        id: getTranslation('containers.list.selectedEntriesModal.selectedCount'),
        defaultMessage:
          '<b>{alreadyPublishedCount}</b> {alreadyPublishedCount, plural, =0 {entries} one {entry} other {entries}} already published. <b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        readyToPublishCount: selectedEntriesWithNoErrorsCount,
        withErrorsCount: selectedEntriesWithErrorsCount,
        alreadyPublishedCount: selectedEntriesPublished,
        b: BoldChunk,
      }
    );
  };

  return (
    <>
      <ModalBody>
        <Typography>{getFormattedCountMessage()}</Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent
            isPublishing={isSubmittingForm}
            rowsToDisplay={rows}
            entriesToPublish={entriesToPublish}
            validationErrors={validationErrors}
          />
        </Box>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={toggleModal} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Flex gap={2}>
            <Button onClick={refetchModalData} variant="tertiary" loading={isFetching}>
              {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
            </Button>
            <Button
              onClick={toggleDialog}
              disabled={
                selectedEntries.length === 0 ||
                selectedEntries.length === selectedEntriesWithErrorsCount ||
                isLoading
              }
              loading={isSubmittingForm}
            >
              {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
            </Button>
          </Flex>
        }
      />
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

const PublishAction: BulkActionComponent = ({ documents }) => {
  const { formatMessage } = useIntl();
  // Publish button visibility
  const hasPublishPermission = useDocumentRBAC('unpublishAction', (state) => state.canPublish);
  const showPublishButton =
    hasPublishPermission && documents.some(({ status }) => status !== 'published');

  const { model, schema, components, isLoading: isLoadingDoc } = useDoc();
  const setSelectedDocuments = useTable('publishAction', (state) => state.selectRow);
  const documentIds = documents.map(({ documentId }) => documentId);

  // We want to keep the selected entries order same as the list view
  const [
    {
      query: { sort, plugins },
    },
  ] = useQueryParams<{ sort?: string; plugins?: Record<string, any> }>();

  // Fetch the documents based on the selected entries and update the modal table
  const {
    data,
    isLoading: isLoadingModalContent,
    isFetching: isFetchingModalContent,
    refetch,
  } = useGetAllDocumentsQuery(
    {
      model,
      params: {
        page: '1',
        pageSize: documentIds.length.toString(),
        sort,
        filters: {
          documentId: {
            $in: documentIds,
          },
        },
        locale: plugins?.i18n?.locale,
      },
    },
    {
      selectFromResult: ({ data, ...restRes }) => ({ data: data?.results ?? [], ...restRes }),
    }
  );

  // Validate the entries based on the schema to show errors if any
  const { rows, validationErrors } = React.useMemo(() => {
    if (data.length > 0 && schema) {
      const validate = createYupSchema(schema.attributes, components);
      const validationErrors: Record<
        TableRow['documentId'],
        Record<string, MessageDescriptor>
      > = {};
      const rows = data.map((entry) => {
        try {
          validate.validateSync(entry, { abortEarly: false });

          return entry;
        } catch (e) {
          if (e instanceof ValidationError) {
            validationErrors[entry.documentId] = getInnerErrors(e);
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
          <Table.Root
            rows={rows}
            defaultSelectedRows={documents}
            headers={TABLE_HEADERS}
            isLoading={isLoadingModalContent || isLoadingDoc || isFetchingModalContent}
          >
            <SelectedEntriesModalContent
              setSelectedDocuments={setSelectedDocuments}
              toggleModal={() => {
                onClose();
                refetchList();
              }}
              refetchModalData={refetch}
              validationErrors={validationErrors}
              isFetching={isFetchingModalContent}
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
