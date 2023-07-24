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

const EntryValidationText = ({ errors, isPublished }) => {
  const { formatMessage } = useIntl();

  if (errors) {
    const errorMessages = Object.entries(errors)
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
        <Tooltip description={errorMessages}>
          <TypographyMaxWidth textColor="danger600" variant="omega" fontWeight="semiBold" ellipsis>
            {errorMessages}
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
            id: 'app.utils.published',
            defaultMessage: 'Published',
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
  errors: null,
  isPublished: false,
};

EntryValidationText.propTypes = {
  errors: PropTypes.shape({
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

const SelectedEntriesTableContent = ({ isPublishing, rowsToDisplay, entriesToPublish }) => {
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
        {rowsToDisplay.map(({ entity, errors }, index) => (
          <Tr key={entity.id}>
            <Body.CheckboxDataCell rowId={entity.id} index={index} />
            <Td>
              <Typography>{entity.id}</Typography>
            </Td>
            {shouldDisplayMainField && (
              <Td>
                <Typography>{entity[mainField]}</Typography>
              </Td>
            )}
            <Td>
              {isPublishing && entriesToPublish.includes(entity.id) ? (
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
                <EntryValidationText errors={errors} isPublished={entity.publishedAt !== null} />
              )}
            </Td>
            <Td>
              <IconButton
                forwardedAs={Link}
                to={{
                  pathname: `${pathname}/${entity.id}`,
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
};

SelectedEntriesTableContent.propTypes = {
  isPublishing: PropTypes.bool,
  rowsToDisplay: PropTypes.arrayOf(PropTypes.object),
  entriesToPublish: PropTypes.arrayOf(PropTypes.number),
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModalContent = ({ toggleModal, refetchModalData, setEntriesToFetch }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, onSelectRow, isLoading, isFetching } = useTableContext();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [rowsToDisplay, setRowsToDisplay] = React.useState([]);
  const [publishedCount, setPublishedCount] = React.useState(0);

  const entriesToPublish = rows
    .filter(({ entity, errors }) => selectedEntries.includes(entity.id) && !errors)
    .map(({ entity }) => entity.id);

  const { post } = useFetchClient();
  const toggleNotification = useNotification();
  const { contentType } = useSelector(listViewDomain());

  const selectedEntriesWithErrorsCount = rowsToDisplay.filter(
    ({ entity, errors }) => selectedEntries.includes(entity.id) && errors
  ).length;
  const selectedEntriesWithNoErrorsCount = selectedEntries.length - selectedEntriesWithErrorsCount;

  const bulkPublishMutation = useMutation(
    (data) =>
      post(`/content-manager/collection-types/${contentType.uid}/actions/bulkPublish`, data),
    {
      onSuccess() {
        const update = rowsToDisplay.filter((row) => {
          if (entriesToPublish.includes(row.entity.id)) {
            // Deselect the entries that have been published from the modal table
            onSelectRow({ name: row.entity.id, value: false });
          }

          // Remove the entries that have been published from the table
          return !entriesToPublish.includes(row.entity.id);
        });

        setRowsToDisplay(update);
        // Set the parent's entries to fetch when clicking refresh
        setEntriesToFetch(update.map(({ entity }) => entity.id));

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

SelectedEntriesModalContent.propTypes = {
  toggleModal: PropTypes.func.isRequired,
  refetchModalData: PropTypes.func.isRequired,
  setEntriesToFetch: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ onToggle }) => {
  const { selectedEntries: selectedListViewEntries } = useTableContext();
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
        const rows = data.results.map((entry) => {
          try {
            schema.validateSync(entry, { abortEarly: false });

            return { entity: entry };
          } catch (e) {
            return {
              entity: entry,
              errors: getYupInnerErrors(e),
            };
          }
        });

        return rows;
      }

      return [];
    }
  );

  return (
    <Table.Root
      rows={data}
      defaultSelectedEntries={selectedListViewEntries}
      colCount={4}
      isLoading={isLoading}
      isFetching={isFetching}
    >
      <SelectedEntriesModalContent
        setEntriesToFetch={setEntriesToFetch}
        toggleModal={onToggle}
        refetchModalData={refetch}
      />
    </Table.Root>
  );
};

SelectedEntriesModal.propTypes = {
  onToggle: PropTypes.func.isRequired,
};

export default SelectedEntriesModal;
