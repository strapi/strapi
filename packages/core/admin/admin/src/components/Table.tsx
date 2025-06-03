/**
 * TODO: honestly, half of this stuff should come straight from
 * the design-system and then we can just wrap round the bits for
 * the i18n & router interactions.
 *
 * So we'll do that in v2 of the DS.
 */

import * as React from 'react';

import {
  Flex,
  Typography,
  Th,
  Tbody,
  Td,
  Tooltip,
  IconButton,
  Thead,
  Tr,
  RawTrProps,
  Checkbox,
  Loader,
  Table as DSTable,
  EmptyStateLayout,
  EmptyStateLayoutProps,
  TableProps,
  RawTdProps,
} from '@strapi/design-system';
import { CaretDown } from '@strapi/icons';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { useControllableState } from '../hooks/useControllableState';
import { useQueryParams } from '../hooks/useQueryParams';

import { createContext } from './Context';

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

interface BaseRow {
  id: string | number;
  [key: string]: any;
}

interface TableHeader<TData = object, THeader = object> {
  /**
   * Typically used by plugins to render a custom cell
   */
  cellFormatter?: (data: TData, header: Omit<THeader, 'cellFormatter'>) => React.ReactNode;
  label: string;
  name: string;
  searchable?: boolean;
  sortable?: boolean;
}

interface TableContextValue<TRow extends BaseRow, THeader extends TableHeader<TRow, THeader>>
  extends Pick<TableProps, 'footer'> {
  colCount: number;
  hasHeaderCheckbox: boolean;
  headers: THeader[];
  isLoading: boolean;
  rowCount: number;
  rows: TRow[];
  setHasHeaderCheckbox: (value: boolean) => void;
  selectedRows: TRow[];
  selectRow: (row: TRow | TRow[]) => void;
}

const [TableProvider, useTable] = createContext<TableContextValue<any, any>>('Table');

interface RootProps<TRow extends BaseRow, THeader extends TableHeader<TRow, THeader>>
  extends Partial<
    Pick<
      TableContextValue<TRow, THeader>,
      'footer' | 'headers' | 'isLoading' | 'rows' | 'selectedRows'
    >
  > {
  children?: React.ReactNode;
  defaultSelectedRows?: TRow[];
  onSelectedRowsChange?: (selectedRows: TRow[]) => void;
}

const Root = <TRow extends BaseRow, THeader extends TableHeader<TRow, THeader>>({
  children,
  defaultSelectedRows,
  footer,
  headers = [],
  isLoading = false,
  onSelectedRowsChange,
  rows = [],
  selectedRows: selectedRowsProps,
}: RootProps<TRow, THeader>) => {
  const [selectedRows = [], setSelectedRows] = useControllableState({
    prop: selectedRowsProps,
    defaultProp: defaultSelectedRows,
    onChange: onSelectedRowsChange,
  });
  const [hasHeaderCheckbox, setHasHeaderCheckbox] = React.useState(false);

  const rowCount = rows.length + 1;
  const colCount = hasHeaderCheckbox ? headers.length + 1 : headers.length;

  const selectRow: TableContextValue<TRow, THeader>['selectRow'] = (row) => {
    if (Array.isArray(row)) {
      setSelectedRows(row);
    } else {
      setSelectedRows((prev = []) => {
        const currentRowIndex = prev.findIndex((r) => r.id === row.id);
        if (currentRowIndex > -1) {
          return prev.toSpliced(currentRowIndex, 1);
        }

        return [...prev, row];
      });
    }
  };

  return (
    <TableProvider
      colCount={colCount}
      hasHeaderCheckbox={hasHeaderCheckbox}
      setHasHeaderCheckbox={setHasHeaderCheckbox}
      footer={footer}
      headers={headers}
      isLoading={isLoading}
      rowCount={rowCount}
      rows={rows}
      selectedRows={selectedRows}
      selectRow={selectRow}
    >
      {children}
    </TableProvider>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

const Content = ({ children }: Table.ContentProps) => {
  const rowCount = useTable('Content', (state) => state.rowCount);
  const colCount = useTable('Content', (state) => state.colCount);
  const footer = useTable('Content', (state) => state.footer);

  return (
    <DSTable rowCount={rowCount} colCount={colCount} footer={footer}>
      {children}
    </DSTable>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Head
 * -----------------------------------------------------------------------------------------------*/

const Head = ({ children }: Table.HeadProps) => {
  return (
    <Thead>
      <Tr>{children}</Tr>
    </Thead>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderCell
 * -----------------------------------------------------------------------------------------------*/

/**
 * @description A header cell in your table, internally will set the query params for sorting to
 * be passed to your data-fetching function.
 */
const HeaderCell = <TData, THead>({ name, label, sortable }: TableHeader<TData, THead>) => {
  const [{ query }, setQuery] = useQueryParams<{ sort?: `${string}:${'ASC' | 'DESC'}` }>();
  const sort = query?.sort ?? '';
  const [sortBy, sortOrder] = sort.split(':');
  const { formatMessage } = useIntl();
  const isSorted = sortBy === name;

  const sortLabel = formatMessage(
    { id: 'components.TableHeader.sort', defaultMessage: 'Sort on {label}' },
    { label }
  );

  const handleClickSort = () => {
    if (sortable) {
      setQuery({
        sort: `${name}:${isSorted && sortOrder === 'ASC' ? 'DESC' : 'ASC'}`,
      });
    }
  };

  return (
    <Th
      action={
        isSorted &&
        sortable && (
          <IconButton label={sortLabel} onClick={handleClickSort} variant="ghost">
            <SortIcon $isUp={sortOrder === 'ASC'} />
          </IconButton>
        )
      }
    >
      <Tooltip label={sortable ? sortLabel : label}>
        <Typography
          textColor="neutral600"
          tag={!isSorted && sortable ? 'button' : 'span'}
          onClick={handleClickSort}
          variant="sigma"
        >
          {label}
        </Typography>
      </Tooltip>
    </Th>
  );
};

const SortIcon = styled(CaretDown)<{
  $isUp: boolean;
}>`
  transform: ${({ $isUp }) => `rotate(${$isUp ? '180' : '0'}deg)`};
`;

/* -------------------------------------------------------------------------------------------------
 * ActionBar
 * -----------------------------------------------------------------------------------------------*/

const ActionBar = ({ children }: Table.ActionBarProps) => {
  const { formatMessage } = useIntl();
  const selectedRows = useTable('ActionBar', (state) => state.selectedRows);

  if (selectedRows.length === 0) return null;

  return (
    <Flex gap={2}>
      <Typography variant="omega" textColor="neutral500">
        {formatMessage(
          {
            id: 'content-manager.components.TableDelete.label',
            defaultMessage: '{number, plural, one {# row} other {# rows}} selected',
          },
          { number: selectedRows.length }
        )}
      </Typography>
      {children}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * HeaderCheckboxCell
 * -----------------------------------------------------------------------------------------------*/

const HeaderCheckboxCell = () => {
  const rows = useTable('HeaderCheckboxCell', (state) => state.rows);
  const selectedRows = useTable('HeaderCheckboxCell', (state) => state.selectedRows);
  const selectRow = useTable('HeaderCheckboxCell', (state) => state.selectRow);
  const setHasHeaderCheckbox = useTable(
    'HeaderCheckboxCell',
    (state) => state.setHasHeaderCheckbox
  );

  const { formatMessage } = useIntl();

  const areAllEntriesSelected = selectedRows.length === rows.length && rows.length > 0;
  const isIndeterminate = !areAllEntriesSelected && selectedRows.length > 0;

  React.useEffect(() => {
    setHasHeaderCheckbox(true);

    return () => setHasHeaderCheckbox(false);
  }, [setHasHeaderCheckbox]);

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      selectRow(rows);
    } else {
      selectRow([]);
    }
  };

  return (
    <Th>
      <Checkbox
        aria-label={formatMessage({
          id: 'global.select-all-entries',
          defaultMessage: 'Select all entries',
        })}
        disabled={rows.length === 0}
        checked={isIndeterminate ? 'indeterminate' : areAllEntriesSelected}
        onCheckedChange={handleSelectAll}
      />
    </Th>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Empty
 * -----------------------------------------------------------------------------------------------*/

const Empty = (props: Table.EmptyProps) => {
  const { formatMessage } = useIntl();

  const rows = useTable('Empty', (state) => state.rows);
  const isLoading = useTable('Empty', (state) => state.isLoading);
  const colCount = useTable('Empty', (state) => state.colCount);

  /**
   * If we're loading or we have some data, we don't show the empty state.
   */
  if (rows.length > 0 || isLoading) {
    return null;
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colCount}>
          <EmptyStateLayout
            content={formatMessage({
              id: 'app.components.EmptyStateLayout.content-document',
              defaultMessage: 'No content found',
            })}
            hasRadius
            icon={<EmptyDocuments width="16rem" />}
            {...props}
          />
        </Td>
      </Tr>
    </Tbody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * LoadingBody
 * -----------------------------------------------------------------------------------------------*/

const Loading = ({ children = 'Loading content' }: Table.LoadingProps) => {
  const isLoading = useTable('Loading', (state) => state.isLoading);
  const colCount = useTable('Loading', (state) => state.colCount);

  if (!isLoading) {
    return null;
  }

  return (
    <Tbody>
      <Tr>
        <Td colSpan={colCount}>
          <Flex justifyContent="center" padding={11} background="neutral0">
            <Loader>{children}</Loader>
          </Flex>
        </Td>
      </Tr>
    </Tbody>
  );
};

/* -------------------------------------------------------------------------------------------------
 * Body
 * -----------------------------------------------------------------------------------------------*/

const Body = ({ children }: Table.BodyProps) => {
  const isLoading = useTable('Body', (state) => state.isLoading);
  const rows = useTable('Body', (state) => state.rows);

  if (isLoading || rows.length === 0) {
    return null;
  }

  return <Tbody>{children}</Tbody>;
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/
const Row = (props: Table.RowProps) => {
  return <Tr {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * Cell
 * -----------------------------------------------------------------------------------------------*/
const Cell = (props: Table.CellProps) => {
  return <Td {...props} />;
};

/* -------------------------------------------------------------------------------------------------
 * Row
 * -----------------------------------------------------------------------------------------------*/
const CheckboxCell = ({ id, ...props }: Table.CheckboxCellProps) => {
  const rows = useTable('CheckboxCell', (state) => state.rows);
  const selectedRows = useTable('CheckboxCell', (state) => state.selectedRows);
  const selectRow = useTable('CheckboxCell', (state) => state.selectRow);

  const { formatMessage } = useIntl();

  const handleSelectRow = () => {
    selectRow(rows.find((row) => row.id === id));
  };

  const isChecked = selectedRows.findIndex((row) => row.id === id) > -1;

  return (
    <Cell {...props} onClick={(e) => e.stopPropagation()}>
      <Checkbox
        aria-label={formatMessage(
          {
            id: 'app.component.table.select.one-entry',
            defaultMessage: `Select {target}`,
          },
          { target: id }
        )}
        disabled={rows.length === 0}
        checked={isChecked}
        onCheckedChange={handleSelectRow}
      />
    </Cell>
  );
};
/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

/**
 * @alpha we may move this component to the design-system.
 * @public
 * @description A generic table component composition. Internally handles the state of the table
 * such as selected rows, loading state, and more assuming the correct pieces are put togther.
 * @example
 * ```tsx
 * interace Data {
 *  id: string;
 *  name: string;
 *  email: string;
 * }
 *
 * const ListView = () => {
 *  const { data, isLoading } = useGetData<Data>();
 *
 *  const headers: Table.Header<Data>[] = [
 *    {
 *      label: 'Name',
 *      name: 'name',
 *      sortable: true,
 *    },
 *    {
 *      label: 'Email',
 *      name: 'email',
 *      sortable: true,
 *    },
 *  ];
 *
 *  return (
 *    <Table.Root rows={data} headers={headers} isLoading={isLoading}>
 *      <Table.Content>
 *        <Table.Head>
 *          {headers.map((head) => (
 *            <Table.HeaderCell key={head.name} {...head} />
 *          ))}
 *        </Table.Head>
 *        <Table.Body>
 *          <Table.Loading />
 *          <Table.Empty />
 *          {data.map((row) => (
 *            <Table.Row key={row.id}>
 *              <Table.Cell>{row.name}</Table.Cell>
 *              <Table.Cell>{row.email}</Table.Cell>
 *            </Table.Row>
 *          ))}
 *        </Table.Body>
 *      </Table.Content>
 *    </Table.Root>
 *  );
 * };
 * ```
 */
const Table = {
  Root,
  Content,
  ActionBar,
  Head,
  HeaderCell,
  HeaderCheckboxCell,
  Body,
  CheckboxCell,
  Cell,
  Row,
  Loading,
  Empty,
};

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Table {
  export type Props<
    TData extends BaseRow,
    THeader extends TableHeader<TData, THeader> = TableHeader<TData, TableHeader>,
  > = RootProps<TData, THeader>;
  export interface ActionBarProps {
    children?: React.ReactNode;
  }

  export interface ContentProps {
    children: React.ReactNode;
  }

  export type Header<TData, THeader> = TableHeader<TData, THeader>;

  export interface HeadProps {
    children: React.ReactNode;
  }

  export interface EmptyProps extends Partial<EmptyStateLayoutProps> {}

  export interface LoadingProps {
    children?: React.ReactNode;
  }

  export interface BodyProps {
    children: React.ReactNode;
  }

  export interface RowProps extends RawTrProps {}

  export interface CellProps extends RawTdProps {}

  export interface CheckboxCellProps extends Pick<BaseRow, 'id'>, Omit<RawTdProps, 'id'> {}
}

export { Table, useTable };
