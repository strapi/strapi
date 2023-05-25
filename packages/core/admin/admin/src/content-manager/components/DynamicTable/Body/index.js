import React from 'react';
import PropTypes from 'prop-types';
import { Link, useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';

import { BaseCheckbox, Box, IconButton, Tbody, Td, Tr, Flex } from '@strapi/design-system';
import { Trash, Duplicate, Pencil } from '@strapi/icons';
import { useTracking, stopPropagation, onRowClick, useTableContext } from '@strapi/helper-plugin';

import { usePluginsQueryParams } from '../../../hooks';
import { getFullName } from '../../../../utils';
import ConfirmDialogDelete from '../ConfirmDialogDelete';

/* -------------------------------------------------------------------------------------------------
 * FieldDataCell
 * -----------------------------------------------------------------------------------------------*/

const FieldDataCell = ({ children, ...props }) => {
  return <Td {...props}>{children}</Td>;
};

FieldDataCell.propTypes = {
  children: PropTypes.node.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * CheckboxDataCell
 * -----------------------------------------------------------------------------------------------*/

const CheckboxDataCell = ({ rowId, firstName, lastName }) => {
  const { selectedEntries } = useTableContext();
  const isChecked = selectedEntries.findIndex((id) => id === rowId) !== -1;
  const { onSelectRow } = useTableContext();
  const { formatMessage } = useIntl();

  return (
    <FieldDataCell {...stopPropagation}>
      <BaseCheckbox
        aria-label={formatMessage(
          {
            id: 'app.component.table.select.one-entry',
            defaultMessage: `Select {target}`,
          },
          { target: getFullName(firstName, lastName) }
        )}
        checked={isChecked}
        onChange={() => {
          onSelectRow({ name: rowId, value: !isChecked });
        }}
      />
    </FieldDataCell>
  );
};

CheckboxDataCell.propTypes = {
  rowId: PropTypes.number.isRequired,
  firstName: PropTypes.string.isRequired,
  lastName: PropTypes.string.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * EntityActionsDataCell
 * -----------------------------------------------------------------------------------------------*/

const EntityActionsDataCell = ({ rowId, itemLineText, canCreate, canDelete }) => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { setSelectedEntries, setIsConfirmDeleteOpen } = useTableContext();
  const pluginsQueryParams = usePluginsQueryParams();
  const {
    location: { pathname },
  } = useHistory();

  return (
    <FieldDataCell>
      <Flex justifyContent="end" {...stopPropagation}>
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
          <Box paddingLeft={1}>
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
          </Box>
        )}

        {canDelete && (
          <Box paddingLeft={1}>
            <IconButton
              onClick={() => {
                trackUsage('willDeleteEntryFromList');
                setSelectedEntries([rowId]);
                setIsConfirmDeleteOpen(true);
              }}
              label={formatMessage(
                { id: 'global.delete-target', defaultMessage: 'Delete {target}' },
                { target: itemLineText }
              )}
              noBorder
              icon={<Trash />}
            />
          </Box>
        )}
      </Flex>
    </FieldDataCell>
  );
};

EntityActionsDataCell.defaultProps = {
  canCreate: false,
  canDelete: false,
};

EntityActionsDataCell.propTypes = {
  rowId: PropTypes.number.isRequired,
  itemLineText: PropTypes.string.isRequired,
  canCreate: PropTypes.bool,
  canDelete: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/

const Row = ({ children, rowData }) => {
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
            pathname: `${pathname}/${rowData.id}`,
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
  rowData: PropTypes.object.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const Root = ({ children, onConfirmDelete }) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const handleConfirmDelete = async () => {
    try {
      setIsLoading(true);
      await onConfirmDelete(selectedEntries[0]);
      setIsConfirmDeleteOpen(false);
      setIsLoading(false);
      setSelectedEntries([]);
    } catch (error) {
      setIsLoading(false);
      setIsConfirmDeleteOpen(false);
    }
  };

  return (
    <Tbody>
      {children}
      <ConfirmDialogDelete
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={() => setIsConfirmDeleteOpen(!isConfirmDeleteOpen)}
        isOpen={isConfirmDeleteOpen}
      />
    </Tbody>
  );
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
};

export const Body = { CheckboxDataCell, EntityActionsDataCell, FieldDataCell, Root, Row };
