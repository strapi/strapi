import * as React from 'react';

import {
  Box,
  Button,
  Typography,
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tr,
  Td,
  IconButton,
  Flex,
  Icon,
  Tooltip,
  Loader,
} from '@strapi/design-system';
import {
  useTableContext,
  Table as HelperPluginTable,
  getYupInnerErrors,
  useQueryParams,
  useNotification,
  TranslationMessage,
  useAPIErrorHandler,
} from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import { Data } from '@strapi/types';
import { MessageDescriptor, useIntl } from 'react-intl';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ValidationError } from 'yup';

import { useDoc } from '../../../../hooks/useDocument';
import { useDocLayout } from '../../../../hooks/useDocumentLayout';
import {
  useGetAllDocumentsQuery,
  usePublishManyDocumentsMutation,
} from '../../../../services/documents';
import { getTranslation } from '../../../../utils/translations';
import { createYupSchema } from '../../../../utils/validation';
import { Table } from '../Table';

import { ConfirmDialogPublishAll, ConfirmDialogPublishAllProps } from './ConfirmBulkActionDialog';

const TypographyMaxWidth = styled(Typography)`
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
        <Icon color="danger600" as={CrossCircle} />
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
        <Icon color="success600" as={CheckCircle} />
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
      <Icon color="success600" as={CheckCircle} />
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
  entriesToPublish?: Data.ID[];
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
}

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
    <HelperPluginTable.Content>
      <HelperPluginTable.Head>
        <HelperPluginTable.HeaderCheckboxCell />
        <HelperPluginTable.HeaderCell attribute={{ type: 'integer' }} label="id" name="id" />
        {shouldDisplayMainField && (
          <HelperPluginTable.HeaderCell attribute={{ type: 'string' }} label="name" name="name" />
        )}
        <HelperPluginTable.HeaderCell attribute={{ type: 'string' }} label="status" name="status" />
      </HelperPluginTable.Head>
      <HelperPluginTable.LoadingBody />
      <HelperPluginTable.Body>
        {rowsToDisplay.map((row, index) => (
          <Tr key={row.id}>
            <Td>
              <Table.CheckboxDataCell rowId={row.id} index={index} />
            </Td>
            <Td>
              <Typography>{row.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{row[mainField as keyof TableRow]}</Typography>
              </Td>
            )}
            <Td>
              {isPublishing && entriesToPublish.includes(row.id) ? (
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
                  validationErrors={validationErrors[row.id]}
                  isPublished={row.publishedAt !== null}
                />
              )}
            </Td>
            <Td>
              <IconButton
                forwardedAs={Link}
                // @ts-expect-error – DS does not correctly infer props from the as prop.
                to={{
                  pathname: `${pathname}/${row.id}`,
                  state: { from: pathname },
                }}
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
            </Td>
          </Tr>
        ))}
      </HelperPluginTable.Body>
    </HelperPluginTable.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks: React.ReactNode) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesModalContentProps
  extends Pick<SelectedEntriesTableContentProps, 'validationErrors'> {
  refetchModalData: React.MouseEventHandler<HTMLButtonElement>;
  setEntriesToFetch: React.Dispatch<React.SetStateAction<Data.ID[]>>;
  setSelectedListViewEntries: React.Dispatch<React.SetStateAction<Data.ID[]>>;
  toggleModal: ConfirmDialogPublishAllProps['onToggleDialog'];
}

interface TableRow {
  id: Data.ID;
  publishedAt: string | null;
}

const SelectedEntriesModalContent = ({
  toggleModal,
  refetchModalData,
  setEntriesToFetch,
  setSelectedListViewEntries,
  validationErrors = {},
}: SelectedEntriesModalContentProps) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, onSelectRow, isLoading, isFetching } = useTableContext<TableRow>();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [rowsToDisplay, setRowsToDisplay] = React.useState<Array<TableRow>>([]);
  const [publishedCount, setPublishedCount] = React.useState(0);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const entriesToPublish = rows
    .filter(({ id }) => selectedEntries.includes(id) && !validationErrors[id])
    .map(({ id }) => id);

  const toggleNotification = useNotification();
  const { model } = useDoc();

  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ id }) => selectedEntries.includes(id) && validationErrors[id]
  ).length;
  const selectedEntriesPublished = rowsToDisplay.filter(
    ({ id, publishedAt }) => selectedEntries.includes(id) && publishedAt
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const [publishManyDocuments, { isLoading: isSubmittingForm }] = usePublishManyDocumentsMutation();
  const handleConfirmBulkPublish = async () => {
    toggleDialog();

    try {
      // @ts-expect-error – TODO: this still expects Entity.ID instead of Document.ID
      const res = await publishManyDocuments({ model: model, ids: entriesToPublish });

      if ('error' in res) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(res.error),
        });

        return;
      }

      const update = rowsToDisplay.filter((row) => {
        if (entriesToPublish.includes(row.id)) {
          // Deselect the entries that have been published from the modal table
          onSelectRow({ name: row.id, value: false });
        }

        // Remove the entries that have been published from the table
        return !entriesToPublish.includes(row.id);
      });

      setRowsToDisplay(update);
      const publishedIds = update.map(({ id }) => id);
      // Set the parent's entries to fetch when clicking refresh
      setEntriesToFetch(publishedIds);
      // Deselect the entries that were published in the list view
      setSelectedListViewEntries(publishedIds);

      if (update.length === 0) {
        toggleModal();
      }

      toggleNotification({
        type: 'success',
        message: { id: 'content-manager.success.record.publish', defaultMessage: 'Published' },
      });

      setPublishedCount(res.data.count);
    } catch {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        },
      });
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

  React.useEffect(() => {
    // When the api responds with data
    if (rows.length > 0) {
      // Update the rows to display
      setRowsToDisplay(rows);
    }
  }, [rows]);

  return (
    <ModalLayout onClose={toggleModal} labelledBy="title">
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTranslation('containers.list.selectedEntriesModal.title'),
            defaultMessage: 'Publish entries',
          })}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Typography>{getFormattedCountMessage()}</Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent
            isPublishing={isSubmittingForm}
            rowsToDisplay={rowsToDisplay}
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
    </ModalLayout>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

interface SelectedEntriesModalProps {
  onToggle: SelectedEntriesModalContentProps['toggleModal'];
}

const SelectedEntriesModal = ({ onToggle }: SelectedEntriesModalProps) => {
  const {
    selectedEntries: selectedListViewEntries,
    setSelectedEntries: setSelectedListViewEntries,
  } = useTableContext();

  const { model, schema, components, isLoading: isLoadingDoc } = useDoc();
  // The child table will update this value based on the entries that were published
  const [entriesToFetch, setEntriesToFetch] = React.useState(selectedListViewEntries);
  // We want to keep the selected entries order same as the list view
  const [
    {
      query: { sort, plugins },
    },
  ] = useQueryParams<{ sort?: string; plugins?: Record<string, any> }>();

  const { data, refetch, isLoading, isFetching } = useGetAllDocumentsQuery(
    {
      model,
      params: {
        page: '1',
        pageSize: entriesToFetch.length.toString(),
        sort,
        filters: {
          id: {
            $in: entriesToFetch,
          },
        },
        locale: plugins?.i18n?.locale,
      },
    },
    {
      selectFromResult: ({ data, ...restRes }) => ({ data: data?.results ?? [], ...restRes }),
    }
  );

  const { rows, validationErrors } = React.useMemo(() => {
    if (data.length > 0 && schema) {
      const validate = createYupSchema(schema.attributes, components);
      const validationErrors: Record<Data.ID, Record<string, TranslationMessage>> = {};
      const rows = data.map((entry) => {
        try {
          validate.validateSync(entry, { abortEarly: false });

          return entry;
        } catch (e) {
          if (e instanceof ValidationError) {
            validationErrors[entry.id] = getYupInnerErrors(e);
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

  return (
    <HelperPluginTable.Root
      rows={rows}
      defaultSelectedEntries={selectedListViewEntries}
      colCount={4}
      isLoading={isLoading || isLoadingDoc}
      isFetching={isFetching}
    >
      <SelectedEntriesModalContent
        setSelectedListViewEntries={setSelectedListViewEntries}
        setEntriesToFetch={setEntriesToFetch}
        toggleModal={onToggle}
        refetchModalData={refetch}
        validationErrors={validationErrors}
      />
    </HelperPluginTable.Root>
  );
};

export { SelectedEntriesModal };
