import * as React from 'react';

import {
  Button,
  Flex,
  Table as TableCompo,
  Typography,
  BaseCheckbox,
  BaseCheckboxProps,
  IconButton,
  Th,
  Thead,
  Tooltip,
  Tr,
  VisuallyHidden,
  TableProps as DSTableProps,
} from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { Entity } from '@strapi/types';
import { useIntl } from 'react-intl';

import { useTracking } from '../features/Tracking';
import { useQueryParams } from '../hooks/useQueryParams';
import { SortIcon } from '../icons/SortIcon';

import { ConfirmDialog } from './ConfirmDialog';
import { EmptyBodyTable, EmptyBodyTableProps } from './EmptyBodyTable';

interface TableProps<
  TRows extends { id: Entity.ID } = { id: Entity.ID },
  THeader extends TableHeader = TableHeader
> extends Pick<EmptyBodyTableProps, 'action'>,
    Pick<DSTableProps, 'footer'> {
  children?: React.ReactNode;
  contentType: string;
  components?: {
    ConfirmDialogDeleteAll?: React.ElementType;
    ConfirmDialogDelete?: React.ElementType;
  };
  headers?: TableHeadProps<THeader>['headers'];
  isLoading?: boolean;
  onConfirmDeleteAll?: (ids: Array<TRows['id']>) => Promise<void>;
  onConfirmDelete?: (id: TRows['id']) => Promise<void>;
  rows?: Array<TRows>;
  withBulkActions?: boolean;
  withMainAction?: boolean;
  renderBulkActionsBar?: (props: {
    selectedEntries: Array<string | number>;
    clearSelectedEntries: () => void;
  }) => React.ReactNode;
}

interface TableRowProps<
  TRows extends { id: Entity.ID } = { id: Entity.ID },
  THeader extends TableHeader = TableHeader
> extends Pick<
      TableProps<TRows, THeader>,
      'withBulkActions' | 'withMainAction' | 'rows' | 'headers'
    >,
    Pick<TableHeadProps<THeader>, 'entriesToDelete'> {
  onClickDelete: (id: TRows['id']) => void;
  onSelectRow: (row: { name: TRows['id']; value: boolean }) => void;
}

/**
 * @deprecated
 * This component will be replaced by packages/core/helper-plugin/src/components/Table
 * in the next major release.
 */
const Table = ({
  action,
  children,
  contentType,
  components,
  footer,
  headers = [],
  isLoading = false,
  onConfirmDeleteAll,
  onConfirmDelete,
  rows = [],
  withBulkActions = false,
  withMainAction = false,
  renderBulkActionsBar,
  ...rest
}: TableProps) => {
  const [selectedEntries, setSelectedEntries] = React.useState<Array<number | string>>([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = React.useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = React.useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = React.useState(false);
  const [{ query }] = useQueryParams<{ filters: string[] }>();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const ROW_COUNT = rows.length + 1;
  const COL_COUNT = headers.length + (withBulkActions ? 1 : 0) + (withMainAction ? 1 : 0);
  const hasFilters = query?.filters !== undefined;
  const areAllEntriesSelected = selectedEntries.length === rows.length && rows.length > 0;

  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType },
      }
    : undefined;

  const handleConfirmDeleteAll = async () => {
    try {
      setIsConfirmButtonLoading(true);
      await onConfirmDeleteAll?.(selectedEntries);
      handleToggleConfirmDeleteAll();
      setSelectedEntries([]);
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleConfirmDeleteAll();
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setIsConfirmButtonLoading(true);
      // await onConfirmDeleteAll(entriesToDelete);
      await onConfirmDelete?.(selectedEntries[0]);
      handleToggleConfirmDelete();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleConfirmDelete();
    }
  };

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setSelectedEntries(rows.map((row) => row.id));
    } else {
      setSelectedEntries([]);
    }
  };

  const handleToggleConfirmDeleteAll = () => {
    if (!showConfirmDeleteAll) {
      trackUsage('willBulkDeleteEntries');
    }

    setShowConfirmDeleteAll((prev) => !prev);
  };

  const handleToggleConfirmDelete = () => {
    if (showConfirmDelete) {
      setSelectedEntries([]);
    }
    setShowConfirmDelete((prev) => !prev);
  };

  const handleClickDelete: TableRowProps['onClickDelete'] = (id) => {
    setSelectedEntries([id]);

    handleToggleConfirmDelete();
  };

  const handleSelectRow: TableRowProps['onSelectRow'] = ({ name, value }) => {
    setSelectedEntries((prev) => {
      if (value) {
        return prev.concat(name);
      }

      return prev.filter((id) => id !== name);
    });
  };

  const clearSelectedEntries = () => {
    setSelectedEntries([]);
  };

  const ConfirmDeleteAllComponent = components?.ConfirmDialogDeleteAll
    ? components.ConfirmDialogDeleteAll
    : ConfirmDialog;

  const ConfirmDeleteComponent = components?.ConfirmDialogDelete
    ? components.ConfirmDialogDelete
    : ConfirmDialog;

  return (
    <>
      {selectedEntries.length > 0 && (
        <Flex gap={3}>
          <Typography variant="omega" textColor="neutral500">
            {formatMessage(
              {
                id: 'content-manager.components.TableDelete.label',
                defaultMessage: '{number, plural, one {# entry} other {# entries}} selected',
              },
              { number: selectedEntries.length }
            )}
          </Typography>
          {renderBulkActionsBar ? (
            renderBulkActionsBar({ selectedEntries, clearSelectedEntries })
          ) : (
            <Button
              onClick={handleToggleConfirmDeleteAll}
              startIcon={<Trash />}
              size="L"
              variant="danger-light"
            >
              {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
            </Button>
          )}
        </Flex>
      )}
      <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT} footer={footer}>
        <TableHead
          areAllEntriesSelected={areAllEntriesSelected}
          entriesToDelete={selectedEntries}
          headers={headers}
          onSelectAll={handleSelectAll}
          withMainAction={withMainAction}
          withBulkActions={withBulkActions}
        />
        {!rows.length || isLoading ? (
          <EmptyBodyTable
            colSpan={COL_COUNT}
            content={content}
            isLoading={isLoading}
            action={action}
          />
        ) : (
          React.Children.toArray(children).map((child) =>
            React.cloneElement(child as React.ReactElement, {
              entriesToDelete: selectedEntries,
              onClickDelete: handleClickDelete,
              onSelectRow: handleSelectRow,
              headers,
              rows,
              withBulkActions,
              withMainAction,
              ...rest,
            })
          )
        )}
      </TableCompo>
      <ConfirmDeleteAllComponent
        isConfirmButtonLoading={isConfirmButtonLoading}
        onConfirm={handleConfirmDeleteAll}
        onToggleDialog={handleToggleConfirmDeleteAll}
        isOpen={showConfirmDeleteAll}
      />
      <ConfirmDeleteComponent
        isConfirmButtonLoading={isConfirmButtonLoading}
        onConfirm={handleConfirmDelete}
        onToggleDialog={handleToggleConfirmDelete}
        isOpen={showConfirmDelete}
      />
    </>
  );
};

interface TableHeader {
  fieldSchema?: {
    type: string;
  };
  name: string;
  metadatas: {
    sortable: boolean;
    label: string;
    mainField?: {
      name: string;
    };
  };
}

interface TableHeadProps<THeader extends TableHeader = TableHeader> {
  areAllEntriesSelected?: boolean;
  entriesToDelete?: Array<string | number>;
  headers?: Array<THeader>;
  onSelectAll: BaseCheckboxProps['onChange'];
  withMainAction?: boolean;
  withBulkActions?: boolean;
}

const TableHead = ({
  areAllEntriesSelected = false,
  entriesToDelete = [],
  headers = [],
  onSelectAll,
  withMainAction,
  withBulkActions,
}: TableHeadProps) => {
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams<{ sort?: string }>();
  const sort = query?.sort ?? '';
  const [sortBy, sortOrder] = sort.split(':');
  const isIndeterminate = !areAllEntriesSelected && entriesToDelete.length > 0;

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
              onChange={onSelectAll}
            />
          </Th>
        )}
        {headers.map(
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
                      onClick={() => handleClickSort()}
                      icon={isSorted && <SortIcon isUp={isUp} />}
                      noBorder
                    />
                  )
                }
              >
                <Tooltip label={isSortable ? sortLabel : label}>
                  <Typography
                    as={!isSorted && isSortable ? 'button' : 'span'}
                    textColor="neutral600"
                    onClick={() => handleClickSort(!isSorted)}
                    variant="sigma"
                  >
                    {label}
                  </Typography>
                </Tooltip>
              </Th>
            );
          }
        )}

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

export { Table as DynamicTable };
export type { TableProps, TableRowProps, TableHeader, TableHeadProps };
