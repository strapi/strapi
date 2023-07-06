import React from 'react';

import {
  Box,
  Button,
  Typography,
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Tbody,
  Tr,
  Td,
  IconButton,
  Flex,
  Icon,
  Tooltip,
} from '@strapi/design-system';
import {
  useTableContext,
  Table,
  getYupInnerErrors,
  useFetchClient,
  useQueryParams,
} from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import PropTypes from 'prop-types';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';
import styled from 'styled-components';

import { getTrad, createYupSchema } from '../../../../../utils';
import { listViewDomain } from '../../../selectors';
import { Body } from '../../Body';

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

const SelectedEntriesTableContent = () => {
  const { rows, isLoading } = useTableContext();
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
      </Table.Head>
      <Table.LoadingBody />
      <Tbody>
        {!isLoading &&
          rows.map((entry, index) => (
            <Tr key={entry.id}>
              <Body.CheckboxDataCell rowId={entry.id} index={index} />
              <Td>
                <Typography>{entry.id}</Typography>
              </Td>
              {shouldDisplayMainField && (
                <Td>
                  <Typography>{entry[mainField]}</Typography>
                </Td>
              )}
              <Td>
                <EntryValidationText
                  errors={entry.errors}
                  isPublished={entry.publishedAt !== null}
                />
              </Td>
              <Td>
                <IconButton
                  forwardedAs={Link}
                  to={{
                    pathname: `${pathname}/${entry.id}`,
                    state: { from: pathname },
                  }}
                  label={formatMessage(
                    { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
                    { target: getItemLineText(index) }
                  )}
                  noBorder
                  target="_blank"
                >
                  <Pencil />
                </IconButton>
              </Td>
            </Tr>
          ))}
      </Tbody>
    </Table.Content>
  );
};

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModalContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModalContent = ({ onToggle, onConfirm, onRefresh }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, isLoading, isFetching } = useTableContext();

  const selectedEntriesWithErrorsCount = rows
    .filter(({ id }) => selectedEntries.includes(id))
    .filter((row) => row.errors).length;
  const selectedEntriesWithNoErrorsCount = selectedEntries.length - selectedEntriesWithErrorsCount;

  return (
    <ModalLayout onClose={onToggle} labelledBy="title">
      <ModalHeader>
        <Typography fontWeight="bold" textColor="neutral800" as="h2" id="title">
          {formatMessage({
            id: getTrad('containers.ListPage.selectedEntriesModal.title'),
            defaultMessage: 'Publish entries',
          })}
        </Typography>
      </ModalHeader>
      <ModalBody>
        <Typography>
          {formatMessage(
            {
              id: getTrad('containers.ListPage.selectedEntriesModal.selectedCount'),
              defaultMessage:
                '<b>{readyToPublishCount}</b> {readyToPublishCount, plural, =0 {entries} one {entry} other {entries}} ready to publish. <b>{withErrorsCount}</b> {withErrorsCount, plural, =0 {entries} one {entry} other {entries}} awaiting for action.',
            },
            {
              readyToPublishCount: selectedEntriesWithNoErrorsCount,
              withErrorsCount: selectedEntriesWithErrorsCount,
              b: BoldChunk,
            }
          )}
        </Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent />
        </Box>
      </ModalBody>
      <ModalFooter
        startActions={
          <Button onClick={onToggle} variant="tertiary">
            {formatMessage({
              id: 'app.components.Button.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
        }
        endActions={
          <Flex gap={2}>
            <Button onClick={onRefresh} variant="tertiary" loading={isFetching}>
              {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
            </Button>
            <Button
              onClick={() => onConfirm(selectedEntries)}
              disabled={
                selectedEntries.length === 0 ||
                selectedEntries.length === selectedEntriesWithErrorsCount ||
                isLoading
              }
            >
              {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
            </Button>
          </Flex>
        }
      />
    </ModalLayout>
  );
};

SelectedEntriesModalContent.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onRefresh: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ onToggle, onConfirm }) => {
  const { selectedEntries } = useTableContext();
  const { contentType, components } = useSelector(listViewDomain());

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
        $in: selectedEntries,
      },
    },
  };

  const { get } = useFetchClient();
  const queryString = stringify(queryParams);

  const { data, isLoading, isFetching, refetch } = useQuery(
    ['entries', contentType.uid, queryParams],
    async () => {
      const { data } = await get(
        `content-manager/collection-types/${contentType.uid}?${queryString}`
      );

      if (data.results) {
        const schema = createYupSchema(contentType, { components }, { isDraft: false });
        const rows = data.results.map((entry) => {
          try {
            schema.validateSync(entry, { abortEarly: false });

            return entry;
          } catch (e) {
            return {
              ...entry,
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
      defaultSelectedEntries={selectedEntries}
      colCount={4}
      isLoading={isLoading}
      isFetching={isFetching}
    >
      <SelectedEntriesModalContent onToggle={onToggle} onConfirm={onConfirm} onRefresh={refetch} />
    </Table.Root>
  );
};

SelectedEntriesModal.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default SelectedEntriesModal;
