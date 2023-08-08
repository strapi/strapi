import * as React from 'react';

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
  Table as DSTable,
} from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import { useQueryParams } from '../hooks/useQueryParams';
import { SortIcon } from '../icons/SortIcon';

import { ConfirmDialog } from './ConfirmDialog';
import { EmptyStateLayout } from './EmptyStateLayout';

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const TableContext = React.createContext(null);

const useTableContext = () => {
  const context = React.useContext(TableContext);

  if (!context) {
    throw new Error('useTableContext must be used within a TableProvider');
  }

  return context;
};

/* -------------------------------------------------------------------------------------------------
 * ActionBar
 * -----------------------------------------------------------------------------------------------*/

const ActionBar = ({ children }) => {
  const { formatMessage } = useIntl();
  const { selectedEntries } = useTableContext();

  if (selectedEntries.length === 0) return null;

  return (
    <Flex gap={2}>
      <Typography variant="omega" textColor="neutral500">
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
  );
};

ActionBar.propTypes = {
  children: PropTypes.node.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * BulkDeleteButton
 * -----------------------------------------------------------------------------------------------*/

const BulkDeleteButton = ({ onConfirmDeleteAll }) => {
  const { selectedEntries, setSelectedEntries } = useTableContext();
  const { formatMessage } = useIntl();
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = React.useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = React.useState(false);

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

BulkDeleteButton.propTypes = {
  onConfirmDeleteAll: PropTypes.func.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Head
 * -----------------------------------------------------------------------------------------------*/

const Head = ({ children }) => {
  return (
    <Thead>
      <Tr>{children}</Tr>
    </Thead>
  );
};

Head.propTypes = {
  children: PropTypes.node.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * HeaderCheckboxCell
 * -----------------------------------------------------------------------------------------------*/

const HeaderCheckboxCell = () => {
  const { selectedEntries, setSelectedEntries, rows } = useTableContext();

  const { formatMessage } = useIntl();

  const areAllEntriesSelected = selectedEntries.length === rows.length && rows.length > 0;
  const isIndeterminate = !areAllEntriesSelected && selectedEntries.length > 0;

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setSelectedEntries(rows.map((row) => row.id));
    } else {
      setSelectedEntries([]);
    }
  };

  if (rows.length === 0) {
    return null;
  }

  return (
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
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderHiddenActionsCell
 * -----------------------------------------------------------------------------------------------*/

const HeaderHiddenActionsCell = () => {
  const { formatMessage } = useIntl();

  return (
    <Th>
      <VisuallyHidden>
        {formatMessage({
          id: 'global.actions',
          defaultMessage: 'Actions',
        })}
      </VisuallyHidden>
    </Th>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderCell
 * -----------------------------------------------------------------------------------------------*/

const HeaderCell = ({ fieldSchemaType, name, relationFieldName, isSortable, label }) => {
  const [{ query }, setQuery] = useQueryParams();
  const sort = query?.sort || '';
  const [sortBy, sortOrder] = sort.split(':');
  const { formatMessage } = useIntl();

  let isSorted = sortBy === name;
  const isUp = sortOrder === 'ASC';

  // relations always have to be sorted by their main field instead of only the
  // attribute name; sortBy e.g. looks like: &sortBy=attributeName[mainField]:ASC
  if (fieldSchemaType === 'relation' && relationFieldName) {
    isSorted = sortBy === `${name.split('.')[0]}[${relationFieldName}]`;
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
      if (fieldSchemaType === 'relation' && relationFieldName) {
        nextSort = `${name.split('.')[0]}[${relationFieldName}]`;
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
        isSorted &&
        isSortable && (
          <IconButton
            label={sortLabel}
            onClick={handleClickSort}
            icon={<SortIcon isUp={isUp} />}
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
          onClick={() => handleClickSort()}
          variant="sigma"
        >
          {label}
        </Typography>
      </Tooltip>
    </Th>
  );
};

HeaderCell.defaultProps = {
  isSortable: false,
  relationFieldName: null,
};

HeaderCell.propTypes = {
  name: PropTypes.string.isRequired,
  fieldSchemaType: PropTypes.string.isRequired,
  relationFieldName: PropTypes.string,
  isSortable: PropTypes.bool,
  label: PropTypes.string.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const Root = ({ children, defaultSelectedEntries, rows, colCount, isLoading, isFetching }) => {
  const [selectedEntries, setSelectedEntries] = React.useState(defaultSelectedEntries);
  const rowCount = rows.length + 1;

  const onSelectRow = React.useCallback(({ name, value }) => {
    setSelectedEntries((prev) => {
      if (value) {
        return prev.concat(name);
      }

      return prev.filter((id) => id !== name);
    });
  }, []);

  const context = React.useMemo(() => {
    return {
      selectedEntries,
      setSelectedEntries,
      onSelectRow,
      rows,
      isLoading,
      isFetching,
      colCount,
      rowCount,
    };
  }, [
    onSelectRow,
    selectedEntries,
    setSelectedEntries,
    rows,
    isLoading,
    isFetching,
    colCount,
    rowCount,
  ]);

  return <TableContext.Provider value={context}>{children}</TableContext.Provider>;
};

Root.defaultProps = {
  rows: [],
  defaultSelectedEntries: [],
  isLoading: false,
  isFetching: false,
  colCount: 0,
};

Root.propTypes = {
  children: PropTypes.node.isRequired,
  rows: PropTypes.arrayOf(PropTypes.object),
  defaultSelectedEntries: PropTypes.arrayOf(PropTypes.number),
  colCount: PropTypes.number,
  isLoading: PropTypes.bool,
  isFetching: PropTypes.bool,
};

/* -------------------------------------------------------------------------------------------------
 * EmptyBody
 * -----------------------------------------------------------------------------------------------*/

const EmptyBody = ({ contentType, ...rest }) => {
  const { rows, colCount, isLoading } = useTableContext();
  const [{ query }] = useQueryParams();
  const hasFilters = query?.filters !== undefined;
  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType },
      }
    : undefined;

  if (rows?.length > 0 || isLoading) {
    return null;
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colCount}>
          <EmptyStateLayout {...rest} content={content} hasRadius={false} shadow="" />
        </Td>
      </Tr>
    </Tbody>
  );
};

EmptyBody.defaultProps = {
  action: undefined,
  icon: undefined,
};

EmptyBody.propTypes = {
  action: PropTypes.any,
  icon: PropTypes.oneOf(['document', 'media', 'permissions']),
  contentType: PropTypes.string.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * LoadingBody
 * -----------------------------------------------------------------------------------------------*/

const LoadingBody = () => {
  const { isLoading, colCount } = useTableContext();

  if (!isLoading) {
    return null;
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colCount}>
          <Flex justifyContent="center">
            <Box padding={11} background="neutral0">
              <Loader>Loading content</Loader>
            </Box>
          </Flex>
        </Td>
      </Tr>
    </Tbody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Body
 * -----------------------------------------------------------------------------------------------*/
const Body = ({ children }) => {
  const { rows, isLoading } = useTableContext();

  if (isLoading || rows.length === 0) {
    return null;
  }

  return <Tbody>{children}</Tbody>;
};

Body.propTypes = {
  children: PropTypes.node.isRequired,
};

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

const Content = ({ children, footer }) => {
  const { rowCount, colCount } = useTableContext();

  return (
    <DSTable rowCount={rowCount} colCount={colCount} footer={footer}>
      {children}
    </DSTable>
  );
};

Content.defaultProps = {
  footer: null,
};

Content.propTypes = {
  footer: PropTypes.node,
  children: PropTypes.node.isRequired,
};

const Table = {
  Content,
  Root,
  Body,
  ActionBar,
  Head,
  HeaderCell,
  HeaderHiddenActionsCell,
  HeaderCheckboxCell,
  LoadingBody,
  EmptyBody,
  BulkDeleteButton,
};

export { Table, useTableContext };
