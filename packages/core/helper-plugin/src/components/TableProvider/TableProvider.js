import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Flex,
  Button,
  Typography,
  Th,
  Tbody,
  Td,
  Tooltip,
  IconButton,
  Thead,
  Tr,
  BaseCheckbox,
  VisuallyHidden,
  Loader,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Trash } from '@strapi/icons';

import useQueryParams from '../../hooks/useQueryParams';
import { useTracking } from '../../features/Tracking';
import ConfirmDialog from '../ConfirmDialog';
import SortIcon from '../../icons/SortIcon';
import EmptyStateLayout from '../EmptyStateLayout';

/* -------------------------------------------------------------------------------------------------
 * TableContext
 * -----------------------------------------------------------------------------------------------*/

const TableContext = React.createContext(null);

export const useTableContext = () => {
  const context = React.useContext(TableContext);

  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider');
  }

  return context;
};

/* -------------------------------------------------------------------------------------------------
 * TableActionBar
 * -----------------------------------------------------------------------------------------------*/

export const TableActionBar = ({ children }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries } = useTableContext();

  if (!selectedEntries.length > 0) return null;

  return (
    <Box paddingBottom={4}>
      <Flex justifyContent="space-between">
        <Flex gap={3}>
          <Typography variant="epsilon" textColor="neutral600">
            {formatMessage(
              {
                id: 'content-manager.components.TableDelete.label',
                defaultMessage: '{number, plural, one {# entry} other {# entries}} selected',
              },
              { number: selectedEntries.length }
            )}
          </Typography>
          {children}
        </Flex>
      </Flex>
    </Box>
  );
};

TableActionBar.propTypes = {
  children: PropTypes.node.isRequired,
};

export const TableButtonBulkDelete = ({ onConfirmDeleteAll }) => {
  const { selectedEntries, setSelectedEntries } = useTableContext();
  const { formatMessage } = useIntl();
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const { trackUsage } = useTracking();

  const handleConfirmDeleteAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmDeleteAll(selectedEntries);
      setIsConfirmButtonLoading(false);
      handleToggleConfirmDeleteAll();
      setSelectedEntries([]);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleConfirmDeleteAll();
    }
  };

  const handleToggleConfirmDeleteAll = () => {
    if (!showConfirmDeleteAll) {
      trackUsage('willBulkDeleteEntries');
    }

    setShowConfirmDeleteAll((prev) => !prev);
  };

  return (
    <>
      <Button
        onClick={handleToggleConfirmDeleteAll}
        startIcon={<Trash />}
        size="L"
        variant="danger-light"
      >
        {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
      </Button>
      <ConfirmDialog
        isConfirmButtonLoading={isConfirmButtonLoading}
        onConfirm={handleConfirmDeleteAll}
        onToggleDialog={handleToggleConfirmDeleteAll}
        isOpen={showConfirmDeleteAll}
      />
    </>
  );
};

TableButtonBulkDelete.propTypes = {
  onConfirmDeleteAll: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * TableHead
 * -----------------------------------------------------------------------------------------------*/

export const TableHead = ({ children, withMainAction, withBulkActions, rows }) => {
  const { selectedEntries, setSelectedEntries } = useTableContext();

  const areAllEntriesSelected = selectedEntries.length === rows.length && rows.length > 0;
  const isIndeterminate = !areAllEntriesSelected && selectedEntries.length > 0;
  const { formatMessage } = useIntl();

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setSelectedEntries(rows.map((row) => row.id));
    } else {
      setSelectedEntries([]);
    }
  };

  return (
    <Thead>
      <Tr>
        {withMainAction && (
          <Th>
            <BaseCheckbox
              aria-label={formatMessage({
                id: 'global.select-all-entries',
                defaultMessage: 'Select all entries',
              })}
              checked={areAllEntriesSelected}
              indeterminate={isIndeterminate}
              onChange={handleSelectAll}
            />
          </Th>
        )}
        {children}
        {withBulkActions && (
          <Th>
            <VisuallyHidden>
              {formatMessage({
                id: 'global.actions',
                defaultMessage: 'Actions',
              })}
            </VisuallyHidden>
          </Th>
        )}
      </Tr>
    </Thead>
  );
};

TableHead.defaultProps = {
  withMainAction: false,
  withBulkActions: false,
  rows: [],
};

TableHead.propTypes = {
  children: PropTypes.node.isRequired,
  withMainAction: PropTypes.bool,
  withBulkActions: PropTypes.bool,
  rows: PropTypes.array,
};

/* -------------------------------------------------------------------------------------------------
 * TableHead
 * -----------------------------------------------------------------------------------------------*/

export const TableHeaders = ({ headers }) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const sort = query?.sort || '';
  const [sortBy, sortOrder] = sort.split(':');

  return headers.map(
    ({ fieldSchema, name, metadatas: { sortable: isSortable, label, mainField } }) => {
      let isSorted = sortBy === name;
      const isUp = sortOrder === 'ASC';

      // relations always have to be sorted by their main field instead of only the
      // attribute name; sortBy e.g. looks like: &sortBy=attributeName[mainField]:ASC
      if (fieldSchema?.type === 'relation' && mainField) {
        isSorted = sortBy === `${name.split('.')[0]}[${mainField.name}]`;
      }

      const sortLabel = formatMessage(
        { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
        { label }
      );

      const handleClickSort = (shouldAllowClick = true) => {
        if (isSortable && shouldAllowClick) {
          let nextSort = name;

          // relations always have to be sorted by their main field instead of only the
          // attribute name; nextSort e.g. looks like: &nextSort=attributeName[mainField]:ASC
          if (fieldSchema?.type === 'relation' && mainField) {
            nextSort = `${name.split('.')[0]}[${mainField.name}]`;
          }

          setQuery({
            sort: `${nextSort}:${isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC'}`,
          });
        }
      };

      return (
        <Th
          key={name}
          action={
            isSorted && (
              <IconButton
                label={sortLabel}
                onClick={handleClickSort}
                icon={isSorted && <SortIcon isUp={isUp} />}
                noBorder
              />
            )
          }
        >
          <Tooltip label={isSortable ? sortLabel : label}>
            <Typography
              textColor="neutral600"
              as={!isSorted && isSortable ? 'button' : 'span'}
              label={label}
              onClick={() => handleClickSort(!isSorted)}
              variant="sigma"
            >
              {label}
            </Typography>
          </Tooltip>
        </Th>
      );
    }
  );
};

TableHeaders.defaultProps = {
  headers: [],
};

TableHeaders.propTypes = {
  headers: PropTypes.arrayOf(
    PropTypes.shape({
      cellFormatter: PropTypes.func,
      key: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({
        label: PropTypes.string.isRequired,
        sortable: PropTypes.bool,
      }).isRequired,
      name: PropTypes.string.isRequired,
    })
  ),
};

/* -------------------------------------------------------------------------------------------------
 * TableEmptyContent
 * -----------------------------------------------------------------------------------------------*/

export const TableEmptyBody = ({ colSpan, isLoading, contentType, ...rest }) => {
  const [{ query }] = useQueryParams();
  const hasFilters = query?.filters !== undefined;

  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType },
      }
    : undefined;

  if (isLoading) {
    return (
      <Tbody>
        <Tr>
          <Td colSpan={colSpan}>
            <Flex justifyContent="center">
              <Box padding={11} background="neutral0">
                <Loader>Loading content...</Loader>
              </Box>
            </Flex>
          </Td>
        </Tr>
      </Tbody>
    );
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colSpan}>
          <EmptyStateLayout {...rest} content={content} hasRadius={false} shadow="" />
        </Td>
      </Tr>
    </Tbody>
  );
};

TableEmptyBody.defaultProps = {
  action: undefined,
  colSpan: 1,
  content: undefined,
  icon: undefined,
  isLoading: false,
};

TableEmptyBody.propTypes = {
  action: PropTypes.any,
  colSpan: PropTypes.number,
  content: PropTypes.shape({
    id: PropTypes.string,
    defaultMessage: PropTypes.string,
    values: PropTypes.object,
  }),
  icon: PropTypes.oneOf(['document', 'media', 'permissions']),
  isLoading: PropTypes.bool,
  contentType: PropTypes.string.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * TableProvider
 * -----------------------------------------------------------------------------------------------*/

export const TableProvider = ({ children }) => {
  const [selectedEntries, setSelectedEntries] = useState([]);

  const context = React.useMemo(() => {
    const handleSelectRow = ({ name, value }) => {
      setSelectedEntries((prev) => {
        if (value) {
          return prev.concat(name);
        }

        return prev.filter((id) => id !== name);
      });
    };

    return {
      selectedEntries,
      setSelectedEntries,
      onSelectRow: handleSelectRow,
    };
  }, [selectedEntries, setSelectedEntries]);

  return <TableContext.Provider value={context}>{children}</TableContext.Provider>;
};

TableProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
