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
} from '@strapi/design-system';
import { useTableContext, Table, getYupInnerErrors } from '@strapi/helper-plugin';
import { Pencil, CrossCircle, CheckCircle } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Link, useHistory } from 'react-router-dom';

import { getTrad, createYupSchema } from '../../../../../utils';
import { listViewDomain } from '../../../selectors';
import { Body } from '../../Body';

/* -------------------------------------------------------------------------------------------------
 * EntryValidationText
 * -----------------------------------------------------------------------------------------------*/

const EntryValidationText = ({ errors, isPublished }) => {
  const { formatMessage } = useIntl();

  if (errors) {
    return (
      <Flex gap={2}>
        <Icon color="danger600" as={CrossCircle} />
        <Typography textColor="danger600" variant="omega" fontWeight="semiBold">
          {Object.keys(errors)
            .map((key) =>
              formatMessage(
                { id: `${errors[key].id}.withField`, defaultMessage: errors[key].defaultMessage },
                { field: key }
              )
            )
            .join(' ')}
        </Typography>
      </Flex>
    );
  }

  if (isPublished) {
    return (
      <Flex gap={2}>
        <Icon color="success600" as={CheckCircle} />
        <Typography textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'TODO',
            defaultMessage: 'Published',
          })}
        </Typography>
      </Flex>
    );
  }

  return (
    <Flex gap={2}>
      <Icon color="success600" as={CheckCircle} />
      <Typography fontWeight="bold">
        {formatMessage({
          id: 'TODO',
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
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
  }),
  isPublished: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesTableContent = ({ errors }) => {
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
      {isLoading ? (
        <Table.LoadingBody />
      ) : (
        <Tbody>
          {rows.map((entry, index) => (
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
                  errors={errors[entry.id]}
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
      )}
    </Table.Content>
  );
};

SelectedEntriesTableContent.defaultProps = {
  errors: {},
};

SelectedEntriesTableContent.propTypes = {
  errors: PropTypes.shape({
    [PropTypes.number]: PropTypes.shape({
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

const SelectedEntriesModalContent = ({ onToggle, onConfirm, onRefreshData }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries, rows, isLoading } = useTableContext();
  const { contentType, components } = useSelector(listViewDomain());

  /**
   * @returns {{validIds: number[], errors: Object.<number, string>}} - Returns an object with the valid ids and the errors
   */
  const validateEntriesToPublish = React.useCallback(() => {
    const validations = { validIds: [], errors: {} };
    // Create the validation schema based on the contentType
    const schema = createYupSchema(contentType, { components }, { isDraft: false });
    // Validate each entry
    rows.forEach((entry) => {
      try {
        schema.validateSync(entry, { abortEarly: false });
        validations.validIds.push(entry.id);
      } catch (e) {
        validations.errors[entry.id] = getYupInnerErrors(e);
      }
    });

    return validations;
  }, [rows, contentType, components]);

  const { errors } = validateEntriesToPublish();

  const atLeastOneEntryHasNoErrors = selectedEntries.some((entryId) => !errors[entryId]);

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
                '<b>{count}</b> {count, plural, =0 {entries} one {entry} other {entries}} selected',
            },
            {
              count: selectedEntries.length,
              b: BoldChunk,
            }
          )}
        </Typography>
        <Box marginTop={5}>
          <SelectedEntriesTableContent errors={errors} />
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
            <Button onClick={onRefreshData} variant="tertiary">
              {formatMessage({ id: 'app.utils.refresh', defaultMessage: 'Refresh' })}
            </Button>
            <Button
              onClick={() => onConfirm(selectedEntries.map)}
              disabled={selectedEntries.length === 0 || !atLeastOneEntryHasNoErrors || isLoading}
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
  onRefreshData: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ onToggle, onConfirm, onRefreshData, isRefreshing }) => {
  const { rows, selectedEntries } = useTableContext();

  // Get the selected entries full data, and keep the list view order
  // Memoize to prevent infinite useEffect runs in SelectedEntriesTableContent
  const entries = React.useMemo(() => {
    return rows.filter((row) => {
      return selectedEntries.includes(row.id);
    });
  }, [rows, selectedEntries]);

  return (
    <Table.Root
      rows={entries}
      defaultSelectedEntries={selectedEntries}
      colCount={4}
      isLoading={isRefreshing}
    >
      <SelectedEntriesModalContent
        onToggle={onToggle}
        onConfirm={onConfirm}
        onRefreshData={onRefreshData}
        isRefreshing={isRefreshing}
      />
    </Table.Root>
  );
};

SelectedEntriesModal.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onRefreshData: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
};

export default SelectedEntriesModal;
