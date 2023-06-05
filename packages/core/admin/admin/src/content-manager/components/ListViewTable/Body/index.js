import React from 'react';
import PropTypes from 'prop-types';
import { Link, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { BaseCheckbox, IconButton, Tbody, Td, Tr, Flex } from '@strapi/design-system';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { useTracking, stopPropagation, onRowClick, useTableContext } from '@strapi/helper-plugin';

import { usePluginsQueryParams } from '../../../hooks';
import ConfirmDialogDelete from '../ConfirmDialogDelete';

/* -------------------------------------------------------------------------------------------------
 * CheckboxDataCell
 * -----------------------------------------------------------------------------------------------*/

const CheckboxDataCell = ({ rowId, index }) => {
  const { selectedEntries } = useTableContext();
  const { formatMessage } = useIntl();
  const isChecked = selectedEntries.findIndex((id) => id === rowId) !== -1;
  const { onSelectRow } = useTableContext();
  const ariaLabel = formatMessage(
    {
      id: 'app.component.table.select.one-entry',
      defaultMessage: `Select {target}`,
    },
    { target: index + 1 }
  );

  return (
    <Td {...stopPropagation}>
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
      <Flex gap={1} justifyContent="end" {...stopPropagation}>
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
          icon={<Pencil />}
        />

        {canCreate && (
          <IconButton
            forwardedAs={Link}
            to={{
              pathname: `${pathname}/create/clone/${rowId}`,
              state: { from: pathname },
              search: pluginsQueryParams,
            }}
            label={formatMessage(
              {
                id: 'app.component.table.duplicate',
                defaultMessage: 'Duplicate {target}',
              },
              { target: itemLineText }
            )}
            noBorder
            icon={<Duplicate />}
          />
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
            icon={<Trash />}
          />
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
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

const Row = ({ children, rowId }) => {
  const pluginsQueryParams = usePluginsQueryParams();
  const {
    push,
    location: { pathname },
  } = useHistory();
  const { trackUsage } = useTracking();

  return (
    <Tr
      {...onRowClick({
        fn() {
          trackUsage('willEditEntryFromList');
          push({
            pathname: `${pathname}/${rowId}`,
            state: { from: pathname },
            search: pluginsQueryParams,
          });
        },
        condition: true, // Always has bulk actions
      })}
    >
      {children}
    </Tr>
  );
};

Row.propTypes = {
  children: PropTypes.node.isRequired,
  rowId: PropTypes.number.isRequired,
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
    <Tbody>
      {children}
      <ConfirmDialogDelete
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={() => setIsConfirmDeleteRowOpen(!isConfirmDeleteRowOpen)}
        isOpen={isConfirmDeleteRowOpen}
      />
    </Tbody>
  );
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  isConfirmDeleteRowOpen: PropTypes.bool.isRequired,
  setIsConfirmDeleteRowOpen: PropTypes.func.isRequired,
};

export const Body = { CheckboxDataCell, EntityActionsDataCell, Root, Row };
