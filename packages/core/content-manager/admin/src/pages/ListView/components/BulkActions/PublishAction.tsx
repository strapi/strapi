import * as React from 'react';

import {
  useQueryParams,
  useAPIErrorHandler,
  useNotification,
  Table,
  useTable,
} from '@strapi/admin/strapi-admin';
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
} from '@strapi/design-system';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { useQueryClient } from 'react-query';
import { Link, useLocation } from 'react-router-dom';
import { styled } from 'styled-components';
import { ValidationError } from 'yup';

import { Document, useDoc } from '../../../../hooks/useDocument';
import { useDocLayout } from '../../../../hooks/useDocumentLayout';
import {
  useGetAllDocumentsQuery,
  usePublishManyDocumentsMutation,
} from '../../../../services/documents';
import { getTranslation } from '../../../../utils/translations';
import { getInnerErrors, createYupSchema } from '../../../../utils/validation';
// import { useAllowedActions } from '../../hooks/useAllowedActions';

import { ConfirmDialogPublishAll, ConfirmDialogPublishAllProps } from './ConfirmBulkActionDialog';

import type { BulkActionComponent } from '../../../../content-manager';
import type { Data } from '@strapi/types';

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
  entriesToPublish?: Data.ID[];
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
}

const TABLE_HEADERS: Table.Header<any, any>[] = [
  { name: 'id', label: 'id' },
  { name: 'name', label: 'name' },
  { name: 'status', label: 'status' },
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
            </Table.Cell>
            <Table.Cell>
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

interface SelectedEntriesModalContentProps
  extends Pick<SelectedEntriesTableContentProps, 'validationErrors'> {
  isDialogOpen: boolean;
  setIsDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  refetchList: () => void;
  setSelectedListViewEntries: React.Dispatch<React.SetStateAction<Document['id'][]>>;
  setEntriesToFetch: React.Dispatch<React.SetStateAction<Document['id'][]>>;
  validationErrors: Record<string, EntryValidationTextProps['validationErrors']>;
  setIsPublishModalBtnDisabled: React.Dispatch<React.SetStateAction<boolean>>;
}

interface TableRow {
  id: Data.ID;
  publishedAt: string | null;
}

const SelectedEntriesModalContent = ({
  // refetchList,
  // setEntriesToFetch,
  // setSelectedListViewEntries,
  validationErrors = {},
}: SelectedEntriesModalContentProps) => {
  const { formatMessage } = useIntl();
  const {
    selectedRows: selectedEntries,
    rows,
    selectRow,
    isLoading,
  } = useTable('SelectedEntriesModal', (state) => state);
  const [rowsToDisplay, setRowsToDisplay] = React.useState<Array<TableRow>>([]);
  const [publishedCount, setPublishedCount] = React.useState(0);
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const entriesToPublish = rows
    .filter(({ id }) => selectedEntries.includes(id) && !validationErrors[id])
    .map(({ id }) => id);

  const { toggleNotification } = useNotification();
  const { model } = useDoc();

  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ id }) => selectedEntries.includes(id) && validationErrors[id]
  ).length;
  const selectedEntriesPublished = rowsToDisplay.filter(
    ({ id, publishedAt }) => selectedEntries.includes(id) && publishedAt
  ).length;
  const selectedEntriesWithNoErrorsCount =
    selectedEntries.length - selectedEntriesWithErrorsCount - selectedEntriesPublished;

  // const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const [publishManyDocuments, { isLoading: isSubmittingForm }] = usePublishManyDocumentsMutation();
  const handleConfirmBulkPublish = async () => {
    // toggleDialog();

    try {
      // @ts-expect-error – TODO: this still expects Entity.ID instead of Document.ID
      const res = await publishManyDocuments({ model: model, ids: entriesToPublish });

      if ('error' in res) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(res.error),
        });

        return;
      }

      const update = rowsToDisplay.filter((row) => {
        if (entriesToPublish.includes(row.id)) {
          // Deselect the entries that have been published from the modal table
          selectRow({ name: row.id, value: false });
        }

        // Remove the entries that have been published from the table
        return !entriesToPublish.includes(row.id);
      });

      setRowsToDisplay(update);
      // const publishedIds = update.map(({ id }) => id);
      // Set the parent's entries to fetch when clicking refresh
      // setEntriesToFetch(publishedIds);
      // Deselect the entries that were published in the list view
      // setSelectedListViewEntries(publishedIds);

      // if (update.length === 0) {
      //   toggleModal();
      // }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-manager.success.record.publish',
          defaultMessage: 'Published',
        }),
      });

      setPublishedCount(res.data.count);
    } catch {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred',
        }),
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
    <>
      <Typography>{getFormattedCountMessage()}</Typography>
      <Box marginTop={5}>
        <SelectedEntriesTableContent
          // isPublishing={bulkPublishMutation.isLoading}
          rowsToDisplay={rowsToDisplay}
          entriesToPublish={entriesToPublish}
          validationErrors={validationErrors}
        />
      </Box>
      {/* <ConfirmDialogPublishAll
        // isOpen={isDialogOpen}
        // onToggleDialog={toggleDialog}
        isConfirmButtonLoading={isSubmittingForm}
        onConfirm={handleConfirmBulkPublish}
      /> */}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PublishAction
 * -----------------------------------------------------------------------------------------------*/

const PublishAction: BulkActionComponent = () => {
  /**
   * TODO: fix this in V5 with the rest of bulk actions
   */
  return null;

  // const { formatMessage } = useIntl();

  // const { selectedRows: selectedListViewEntries, selectRow: setSelectedListViewEntries } = useTable(
  //   'SelectedEntriesModal',
  //   (state) => state
  // );

  // const { model, schema, components, isLoading: isLoadingDoc } = useDoc();
  // // const selectedEntriesObjects = list.filter((entry) => selectedEntries.includes(entry.id));
  // // const hasPublishPermission = useAllowedActions(slug).canPublish;
  // const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  // const queryClient = useQueryClient();
  // // const showPublishButton =
  // //   hasPublishPermission && selectedEntriesObjects.some((entry) => !entry.publishedAt);
  // const [isPublishModalBtnDisabled, setIsPublishModalBtnDisabled] = React.useState(true);

  // // The child table will update this value based on the entries that were published
  // const [entriesToFetch, setEntriesToFetch] = React.useState(selectedListViewEntries);
  // // We want to keep the selected entries order same as the list view
  // const [
  //   {
  //     query: { sort, plugins },
  //   },
  // ] = useQueryParams<{ sort?: string; plugins?: Record<string, any> }>();

  // const { data, isLoading, isFetching } = useGetAllDocumentsQuery(
  //   {
  //     model,
  //     params: {
  //       page: '1',
  //       pageSize: entriesToFetch.length.toString(),
  //       sort,
  //       filters: {
  //         id: {
  //           $in: entriesToFetch,
  //         },
  //       },
  //       locale: plugins?.i18n?.locale,
  //     },
  //   },
  //   {
  //     selectFromResult: ({ data, ...restRes }) => ({ data: data?.results ?? [], ...restRes }),
  //   }
  // );

  // const { rows, validationErrors } = React.useMemo(() => {
  //   if (data.length > 0 && schema) {
  //     const validate = createYupSchema(schema.attributes, components);
  //     const validationErrors: Record<Data.ID, Record<string, MessageDescriptor>> = {};
  //     const rows = data.map((entry) => {
  //       try {
  //         validate.validateSync(entry, { abortEarly: false });

  //         return entry;
  //       } catch (e) {
  //         if (e instanceof ValidationError) {
  //           validationErrors[entry.id] = getInnerErrors(e);
  //         }

  //         return entry;
  //       }
  //     });

  //     return { rows, validationErrors };
  //   }

  //   return {
  //     rows: [],
  //     validationErrors: {},
  //   };
  // }, [components, data, schema]);

  // const refetchList = () => {
  //   // queryClient.invalidateQueries(['content-manager', 'collection-types', slug]);
  // };

  // // If all the entries are published, we want to refetch the list view
  // if (rows.length === 0) {
  //   refetchList();
  // }

  // // if (!showPublishButton) return null;

  // return {
  //   actionType: 'publish',
  //   variant: 'tertiary',
  //   label: formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' }),
  //   dialog: {
  //     type: 'modal',
  //     title: formatMessage({
  //       id: getTranslation('containers.ListPage.selectedEntriesModal.title'),
  //       defaultMessage: 'Publish entries',
  //     }),
  //     content: (
  //       <Table.Root
  //         rows={rows}
  //         defaultSelectedRows={selectedListViewEntries}
  //         headers={TABLE_HEADERS}
  //         isLoading={isLoading || isLoadingDoc || isFetching}
  //       >
  //         <SelectedEntriesModalContent
  //           isDialogOpen={isDialogOpen}
  //           setIsDialogOpen={setIsDialogOpen}
  //           refetchList={refetchList}
  //           setSelectedListViewEntries={setSelectedListViewEntries}
  //           setEntriesToFetch={setEntriesToFetch}
  //           validationErrors={validationErrors}
  //           setIsPublishModalBtnDisabled={setIsPublishModalBtnDisabled}
  //         />
  //       </Table.Root>
  //     ),
  //     footer: ({ onClose }) => {
  //       return (
  //         <ModalFooter
  //           startActions={
  //             <Button
  //               onClick={() => {
  //                 onClose();
  //                 refetchList();
  //               }}
  //               variant="tertiary"
  //             >
  //               {formatMessage({
  //                 id: 'app.components.Button.cancel',
  //                 defaultMessage: 'Cancel',
  //               })}
  //             </Button>
  //           }
  //           endActions={
  //             <Flex gap={2}>
  //               <Button /* onClick={() => refetchModalData()} */ variant="tertiary">
  //                 {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
  //               </Button>
  //               <Button
  //                 onClick={() => setIsDialogOpen((prev) => !prev)}
  //                 disabled={isPublishModalBtnDisabled}
  //                 // TODO: in V5 when bulk actions are refactored, we should use the isLoading prop
  //                 // loading={bulkPublishMutation.isLoading}
  //               >
  //                 {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
  //               </Button>
  //             </Flex>
  //           }
  //         />
  //       );
  //     },
  //     onClose: () => {
  //       refetchList();
  //     },
  //   },
  // };
};

export { PublishAction, SelectedEntriesModalContent };
