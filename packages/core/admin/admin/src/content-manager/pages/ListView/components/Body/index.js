import React from 'react';

import { BaseCheckbox, IconButton, Td, Flex } from '@strapi/design-system';
import { useTracking, useTableContext, Table } from '@strapi/helper-plugin';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Link, useHistory } from 'react-router-dom';

import { usePluginsQueryParams } from '../../../../hooks';
import { ConfirmDialogDelete } from '../ConfirmDialogDelete';

const stopPropagation = (e) => e.stopPropagation();

/* -------------------------------------------------------------------------------------------------
 * CheckboxDataCell
 * -----------------------------------------------------------------------------------------------*/

const CheckboxDataCell = ({ rowId, index }) => {
  const { selectedEntries, onSelectRow } = useTableContext();
  const { formatMessage } = useIntl();
  const isChecked = selectedEntries.findIndex((id) => id === rowId) !== -1;
  const ariaLabel = formatMessage(
    {
      id: 'app.component.table.select.one-entry',
      defaultMessage: `Select {target}`,
    },
    { target: index + 1 }
  );

  return (
    <Td onClick={stopPropagation}>
      <BaseCheckbox
        aria-label={ariaLabel}
        checked={isChecked}
        onChange={() => {
          onSelectRow({ name: rowId, value: !isChecked });
        }}
      />
    </Td>
  );
};

CheckboxDataCell.propTypes = {
  rowId: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * EntityActionsDataCell
 * -----------------------------------------------------------------------------------------------*/

const EntityActionsDataCell = ({
  rowId,
  index,
  canCreate,
  canDelete,
  setIsConfirmDeleteRowOpen,
  handleCloneClick,
}) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { setSelectedEntries } = useTableContext();
  const pluginsQueryParams = usePluginsQueryParams();
  const {
    location: { pathname },
  } = useHistory();

  const itemLineText = formatMessage(
    {
      id: 'content-manager.components.ListViewTable.row-line',
      defaultMessage: 'item line {number}',
    },
    { number: index + 1 }
  );

  return (
    <Td>
      <Flex gap={1} justifyContent="end" onClick={stopPropagation}>
        <IconButton
          forwardedAs={Link}
          onClick={() => {
            trackUsage('willEditEntryFromButton');
          }}
          to={{
            pathname: `${pathname}/${rowId}`,
            state: { from: pathname },
            search: pluginsQueryParams,
          }}
          label={formatMessage(
            { id: 'app.component.table.edit', defaultMessage: 'Edit {target}' },
            { target: itemLineText }
          )}
          noBorder
        >
          <Pencil />
        </IconButton>

        {canCreate && (
          <IconButton
            onClick={handleCloneClick(rowId)}
            label={formatMessage(
              {
                id: 'app.component.table.duplicate',
                defaultMessage: 'Duplicate {target}',
              },
              { target: itemLineText }
            )}
            noBorder
          >
            <Duplicate />
          </IconButton>
        )}

        {canDelete && (
          <IconButton
            onClick={() => {
              trackUsage('willDeleteEntryFromList');
              setSelectedEntries([rowId]);
              setIsConfirmDeleteRowOpen(true);
            }}
            label={formatMessage(
              { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
              { target: itemLineText }
            )}
            noBorder
          >
            <Trash />
          </IconButton>
        )}
      </Flex>
    </Td>
  );
};

EntityActionsDataCell.defaultProps = {
  canCreate: false,
  canDelete: false,
};

EntityActionsDataCell.propTypes = {
  rowId: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  setIsConfirmDeleteRowOpen: PropTypes.func.isRequired,
  handleCloneClick: PropTypes.func.isRequired,
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const Root = ({ children, onConfirmDelete, isConfirmDeleteRowOpen, setIsConfirmDeleteRowOpen }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      await onConfirmDelete(selectedEntries[0]);
      setIsConfirmDeleteRowOpen(false);
      setIsLoading(false);
      setSelectedEntries([]);
    } catch (error) {
      setIsLoading(false);
      setIsConfirmDeleteRowOpen(false);
    }
  };

  return (
    <Table.Body>
      {children}
      <ConfirmDialogDelete
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={() => setIsConfirmDeleteRowOpen(!isConfirmDeleteRowOpen)}
        isOpen={isConfirmDeleteRowOpen}
      />
    </Table.Body>
  );
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  isConfirmDeleteRowOpen: PropTypes.bool.isRequired,
  setIsConfirmDeleteRowOpen: PropTypes.func.isRequired,
};

export const Body = { CheckboxDataCell, EntityActionsDataCell, Root };
