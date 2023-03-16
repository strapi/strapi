import React, { Children, cloneElement, useState } from 'react';
import PropTypes from 'prop-types';
import { Box, Flex, Button, Typography, Table as TableCompo } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { Trash } from '@strapi/icons';
import styled from 'styled-components';
import useQueryParams from '../../hooks/useQueryParams';
import useTracking from '../../hooks/useTracking';
import ConfirmDialog from '../ConfirmDialog';
import EmptyBodyTable from '../EmptyBodyTable';
import TableHead from './TableHead';

const BlockActions = styled(Flex)`
  & > * + * {
    margin-left: ${({ theme }) => theme.spaces[2]};
  }

  margin-left: ${({ pullRight }) => (pullRight ? 'auto' : undefined)};
`;

const Table = ({
  action,
  children,
  contentType,
  components,
  footer,
  headers,
  isLoading,
  onConfirmDeleteAll,
  onConfirmDelete,
  onOpenDeleteAllModalTrackedEvent,
  rows,
  withBulkActions,
  withMainAction,
  ...rest
}) => {
  const [entriesToDelete, setEntriesToDelete] = useState([]);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isConfirmButtonLoading, setIsConfirmButtonLoading] = useState(false);
  const [{ query }] = useQueryParams();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const ROW_COUNT = rows.length + 1;
  const COL_COUNT = headers.length + (withBulkActions ? 1 : 0) + (withMainAction ? 1 : 0);
  const hasFilters = query?.filters !== undefined;
  const areAllEntriesSelected = entriesToDelete.length === rows.length && rows.length > 0;

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
      await onConfirmDeleteAll(entriesToDelete);
      handleToggleConfirmDeleteAll();
      setEntriesToDelete([]);
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
      await onConfirmDelete(entriesToDelete[0]);
      handleToggleConfirmDelete();
      setIsConfirmButtonLoading(false);
    } catch (err) {
      setIsConfirmButtonLoading(false);
      handleToggleConfirmDelete();
    }
  };

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setEntriesToDelete(rows.map((row) => row.id));
    } else {
      setEntriesToDelete([]);
    }
  };

  const handleToggleConfirmDeleteAll = () => {
    if (!showConfirmDeleteAll && onOpenDeleteAllModalTrackedEvent) {
      trackUsage(onOpenDeleteAllModalTrackedEvent);
    }

    setShowConfirmDeleteAll((prev) => !prev);
  };

  const handleToggleConfirmDelete = () => {
    if (showConfirmDelete) {
      setEntriesToDelete([]);
    }
    setShowConfirmDelete((prev) => !prev);
  };

  const handleClickDelete = (id) => {
    setEntriesToDelete([id]);

    handleToggleConfirmDelete();
  };

  const handleSelectRow = ({ name, value }) => {
    setEntriesToDelete((prev) => {
      if (value) {
        return prev.concat(name);
      }

      return prev.filter((id) => id !== name);
    });
  };

  const ConfirmDeleteAllComponent = components?.ConfirmDialogDeleteAll
    ? components.ConfirmDialogDeleteAll
    : ConfirmDialog;

  const ConfirmDeleteComponent = components?.ConfirmDialogDelete
    ? components.ConfirmDialogDelete
    : ConfirmDialog;

  return (
    <>
      {entriesToDelete.length > 0 && (
        <Box>
          <Box paddingBottom={4}>
            <Flex justifyContent="space-between">
              <BlockActions>
                <Typography variant="epsilon" textColor="neutral600">
                  {formatMessage(
                    {
                      id: 'content-manager.components.TableDelete.label',
                      defaultMessage: '{number, plural, one {# entry} other {# entries}} selected',
                    },
                    { number: entriesToDelete.length }
                  )}
                </Typography>
                <Button
                  onClick={handleToggleConfirmDeleteAll}
                  startIcon={<Trash />}
                  size="L"
                  variant="danger-light"
                >
                  {formatMessage({ id: 'global.delete', defaultMessage: 'Delete' })}
                </Button>
              </BlockActions>
            </Flex>
          </Box>
        </Box>
      )}
      <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT} footer={footer}>
        <TableHead
          areAllEntriesSelected={areAllEntriesSelected}
          entriesToDelete={entriesToDelete}
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
          Children.toArray(children).map((child) =>
            cloneElement(child, {
              entriesToDelete,
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

Table.defaultProps = {
  action: undefined,
  children: undefined,
  components: {
    ConfirmDialogDeleteAll: undefined,
    ConfirmDialogDelete: undefined,
  },
  footer: undefined,
  headers: [],
  isLoading: false,
  onConfirmDeleteAll() {},
  onConfirmDelete() {},
  onOpenDeleteAllModalTrackedEvent: undefined,
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

Table.propTypes = {
  action: PropTypes.node,
  children: PropTypes.node,
  contentType: PropTypes.string.isRequired,
  components: PropTypes.shape({
    ConfirmDialogDelete: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
    ConfirmDialogDeleteAll: PropTypes.oneOfType([PropTypes.func, PropTypes.element]),
  }),
  footer: PropTypes.node,
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
  isLoading: PropTypes.bool,
  onConfirmDeleteAll: PropTypes.func,
  onConfirmDelete: PropTypes.func,
  onOpenDeleteAllModalTrackedEvent: PropTypes.string,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default Table;
