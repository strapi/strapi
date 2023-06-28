import React from 'react';

import {
  Box,
  Button,
  Typography,
  ModalLayout,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@strapi/design-system';
import { useTableContext, Table } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { getTrad } from '../../../../utils';

import SelectedEntriesTableContent from './SelectedEntriesTableContent';

/* -------------------------------------------------------------------------------------------------
 * BoldChunk
 * -----------------------------------------------------------------------------------------------*/

const BoldChunk = (chunks) => <Typography fontWeight="bold">{chunks}</Typography>;

/* -------------------------------------------------------------------------------------------------
 * SelectedEntriesModal
 * -----------------------------------------------------------------------------------------------*/

const SelectedEntriesModal = ({ isOpen, onToggle, onConfirm }) => {
  const { formatMessage } = useIntl();
  const { rows, selectedEntries } = useTableContext();

  // Only used to mirror the state of the nested table component
  // setEntriesToPublish should not be called directly
  const [entriesToPublish, setEntriesToPublish] = React.useState([]);

  // Get the selected entries full data, and keep the list view order
  // Memoize to prevent infinite useEffect runs in SelectedEntriesTableContent
  const entries = React.useMemo(() => {
    return rows.filter((row) => {
      return selectedEntries.includes(row.id);
    });
  }, [rows, selectedEntries]);

  if (!isOpen) {
    return null;
  }

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
              count: entriesToPublish.length,
              b: BoldChunk,
            }
          )}
        </Typography>
        <Table.Root rows={entries} defaultSelectedEntries={selectedEntries} colCount={4}>
          <Box marginTop={5}>
            <SelectedEntriesTableContent notifySelectionChange={setEntriesToPublish} />
          </Box>
        </Table.Root>
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
          <Button onClick={onConfirm} disabled={entriesToPublish.length === 0}>
            {formatMessage({ id: 'app.utils.publish', defaultMessage: 'Publish' })}
          </Button>
        }
      />
    </ModalLayout>
  );
};

SelectedEntriesModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
};

export default SelectedEntriesModal;
