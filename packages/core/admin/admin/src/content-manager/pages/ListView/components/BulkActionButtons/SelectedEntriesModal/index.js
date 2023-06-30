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
} from '@strapi/design-system';
import { useTableContext, Table } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { getTrad } from '../../../../../utils';
import { listViewDomain } from '../../../selectors';
import { Body } from '../../Body';

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesTableContent
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesTableContent = () => {
  const { rows } = useTableContext();

  // Get main field from list view layout
  const listViewStore = useSelector(listViewDomain());
  const { mainField } = listViewStore.contentType.settings;
  const shouldDisplayMainField = mainField != null && mainField !== 'id';

  return (
    <Table.Content>
      <Table.Head>
        <Table.HeaderCheckboxCell />
        <Table.HeaderCell fieldSchemaType="number" label="id" name="id" />
        {shouldDisplayMainField && (
          <Table.HeaderCell fieldSchemaType="string" label="name" name="name" />
        )}
      </Table.Head>
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

const SelectedEntriesModalContent = ({ onToggle, onConfirm }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries } = useTableContext();

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
          <Button
            onClick={() => onConfirm(selectedEntries)}
            disabled={selectedEntries.length === 0}
          >
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
        }
      />
    </ModalLayout>
  );
};

SelectedEntriesModalContent.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ onToggle, onConfirm }) => {
  const { rows, selectedEntries } = useTableContext();

  // Get the selected entries full data, and keep the list view order
  // Memoize to prevent infinite useEffect runs in SelectedEntriesTableContent
  const entries = React.useMemo(() => {
    return rows.filter((row) => {
      return selectedEntries.includes(row.id);
    });
  }, [rows, selectedEntries]);

  return (
    <Table.Root rows={entries} defaultSelectedEntries={selectedEntries} colCount={4}>
      <SelectedEntriesModalContent onToggle={onToggle} onConfirm={onConfirm} />
    </Table.Root>
  );
};

SelectedEntriesModal.propTypes = {
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default SelectedEntriesModal;
