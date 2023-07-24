import React from 'react';

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
  Table,
  getYupInnerErrors,
  useFetchClient,
  useQueryParams,
  useNotification,
} from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import styled from 'styled-components';

import formatAPIError from '../../../../../../utils/formatAPIErrors';
import { getTrad, createYupSchema } from '../../../../../utils';
import { listViewDomain } from '../../../selectors';
import { Body } from '../../Body';
import { ConfirmDialogPublishAll } from '../ConfirmBulkActionDialog';

const TypographyMaxWidth = styled(Typography)`
  max-width: 300px;
`;

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

const EntryValidationText = ({ validationErrors, isPublished }) => {
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

EntryValidationText.defaultProps = {
  validationErrors: undefined,
  isPublished: false,
};

EntryValidationText.propTypes = {
  validationErrors: PropTypes.shape({
    [PropTypes.string]: PropTypes.shape({
      id: PropTypes.string,
      defaultMessage: PropTypes.string,
    }),
  }),
  isPublished: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesTableContent = ({
  isPublishing,
  rowsToDisplay,
  entriesToPublish,
  validationErrors,
}) => {
  const {
    location: { pathname },
  } = useHistory();
  const { formatMessage } = useIntl();

  // Get main field from list view layout
  const listViewStore = useSelector(listViewDomain());
  const { mainField } = listViewStore.contentType.settings;
  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  const getItemLineText = (count) =>
    formatMessage(
      {
        id: 'content-manager.components.ListViewTable.row-line',
        defaultMessage: 'item line {number}',
      },
      { number: count + 1 }
    );

  return (
    <Table.Content>
      <Table.Head>
        <Table.HeaderCheckboxCell />
        <Table.HeaderCell fieldSchemaType="number" label="id" name="id" />
        {shouldDisplayMainField && (
          <Table.HeaderCell fieldSchemaType="string" label="name" name="name" />
        )}
        <Table.HeaderCell fieldSchemaType="string" label="status" name="status" />
      </Table.Head>
      <Table.LoadingBody />
      <Table.Body>
        {rowsToDisplay.map((row, index) => (
          <Tr key={row.id}>
            <Body.CheckboxDataCell rowId={row.id} index={index} />
            <Td>
              <Typography>{row.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{row[mainField]}</Typography>
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
                to={{
                  pathname: `${pathname}/${row.id}`,
                  state: { from: pathname },
                }}
                label={formatMessage(
                  { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                  { target: getItemLineText(index) }
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
      </Table.Body>
    </Table.Content>
  );
};

SelectedEntriesTableContent.defaultProps = {
  isPublishing: false,
  rowsToDisplay: [],
  entriesToPublish: [],
  validationErrors: {},
};

SelectedEntriesTableContent.propTypes = {
  isPublishing: PropTypes.bool,
  rowsToDisplay: PropTypes.arrayOf(PropTypes.object),
  entriesToPublish: PropTypes.arrayOf(PropTypes.number),
  validationErrors: PropTypes.shape({
    [PropTypes.string]: PropTypes.shape({
      id: PropTypes.string,
      defaultMessage: PropTypes.string,
    }),
  }),
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModalContent = ({
  toggleModal,
  refetchModalData,
  setEntriesToFetch,
  setSelectedListViewEntries,
  validationErrors,
}) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, onSelectRow, isLoading, isFetching } = useTableContext();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [rowsToDisplay, setRowsToDisplay] = React.useState([]);
  const [publishedCount, setPublishedCount] = React.useState(0);

  const entriesToPublish = rows
    .filter(({ id }) => selectedEntries.includes(id) && !validationErrors[id])
    .map(({ id }) => id);

  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const { contentType } = useSelector(listViewDomain());

  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ id }) => selectedEntries.includes(id) && validationErrors[id]
  ).length;
  const selectedEntriesWithNoErrorsCount = selectedEntries.length - selectedEntriesWithErrorsCount;

  const bulkPublishMutation = useMutation(
    (data) =>
      post(`/content-manager/collection-types/${contentType.uid}/actions/bulkPublish`, data),
    {
      onSuccess() {
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
      },
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },
    }
  );

  const toggleDialog = () => setIsDialogOpen((prev) => !prev);

  const handleConfirmBulkPublish = async () => {
    toggleDialog();
    const { data } = await bulkPublishMutation.mutateAsync({ ids: entriesToPublish });
    setPublishedCount(data.count);
  };

  const getFormattedCountMessage = () => {
    if (publishedCount) {
      return formatMessage(
        {
          id: getTrad('containers.ListPage.selectedEntriesModal.publishedCount'),
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
        id: getTrad('containers.ListPage.selectedEntriesModal.selectedCount'),
        defaultMessage:
          '<b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} waiting for action.',
      },
      {
        readyToPublishCount: selectedEntriesWithNoErrorsCount,
        withErrorsCount: selectedEntriesWithErrorsCount,
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
            id: getTrad('containers.ListPage.selectedEntriesModal.title'),
            defaultMessage: 'Publish entries',
          })}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Typography>{getFormattedCountMessage()}</Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent
            isPublishing={bulkPublishMutation.isLoading}
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
              loading={bulkPublishMutation.isLoading}
            >
              {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
            </Button>
          </Flex>
        }
      />
      <ConfirmDialogPublishAll
        isOpen={isDialogOpen}
        onToggleDialog={toggleDialog}
        isConfirmButtonLoading={bulkPublishMutation.isLoading}
        onConfirm={handleConfirmBulkPublish}
      />
    </ModalLayout>
  );
};

SelectedEntriesModalContent.defaultProps = {
  validationErrors: {},
};

SelectedEntriesModalContent.propTypes = {
  toggleModal: PropTypes.func.isRequired,
  refetchModalData: PropTypes.func.isRequired,
  setEntriesToFetch: PropTypes.func.isRequired,
  setSelectedListViewEntries: PropTypes.func.isRequired,
  validationErrors: PropTypes.shape({
    [PropTypes.string]: PropTypes.shape({
      id: PropTypes.string,
      defaultMessage: PropTypes.string,
    }),
  }),
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ onToggle }) => {
  const {
    selectedEntries: selectedListViewEntries,
    setSelectedEntries: setSelectedListViewEntries,
  } = useTableContext();
  const { contentType, components } = useSelector(listViewDomain());
  // The child table will update this value based on the entries that were published
  const [entriesToFetch, setEntriesToFetch] = React.useState(selectedListViewEntries);
  // We want to keep the selected entries order same as the list view
  const [
    {
      query: { sort },
    },
  ] = useQueryParams();

  const queryParams = {
    page: 1,
    pageSize: entriesToFetch.length,
    sort,
    filters: {
      id: {
        $in: entriesToFetch,
      },
    },
  };

  const { get } = useFetchClient();

  const { data, isLoading, isFetching, refetch } = useQuery(
    ['entries', contentType.uid, queryParams],
    async () => {
      const { data } = await get(`content-manager/collection-types/${contentType.uid}`, {
        params: queryParams,
      });

      if (data.results) {
        const schema = createYupSchema(contentType, { components }, { isDraft: false });
        const validationErrors = {};
        const rows = data.results.map((entry) => {
          try {
            schema.validateSync(entry, { abortEarly: false });

            return entry;
          } catch (e) {
            validationErrors[entry.id] = getYupInnerErrors(e);

            return entry;
          }
        });

        return { rows, validationErrors };
      }

      return {
        rows: [],
        validationErrors: {},
      };
    }
  );

  return (
    <Table.Root
      rows={data?.rows}
      defaultSelectedEntries={selectedListViewEntries}
      colCount={4}
      isLoading={isLoading}
      isFetching={isFetching}
    >
      <SelectedEntriesModalContent
        setSelectedListViewEntries={setSelectedListViewEntries}
        setEntriesToFetch={setEntriesToFetch}
        toggleModal={onToggle}
        refetchModalData={refetch}
        validationErrors={data?.validationErrors}
      />
    </Table.Root>
  );
};

SelectedEntriesModal.propTypes = {
  onToggle: PropTypes.func.isRequired,
};

export default SelectedEntriesModal;
