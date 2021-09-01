import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Table as TableCompo } from '@strapi/parts';
import { EmptyBodyTable, useQueryParams } from '@strapi/helper-plugin';
import TableHead from './TableHead';
import TableRows from './TableRows';

const Table = ({ canDelete, canUpdate, headers, rows, withBulkActions, withMainAction }) => {
  const [entriesToDelete, setEntriesToDelete] = useState([]);
  const [{ query }] = useQueryParams();
  const ROW_COUNT = rows.length + 1;
  const COL_COUNT = headers.length + (withBulkActions ? 1 : 0) + (withMainAction ? 1 : 0);
  const hasFilters = query.filters !== undefined;
  const areAllEntriesSelected = entriesToDelete.length === rows.length && rows.length > 0;

  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType: 'Users' },
      }
    : undefined;

  const handleSelectAll = () => {
    if (!areAllEntriesSelected) {
      setEntriesToDelete(rows.map(row => row.id));
    } else {
      setEntriesToDelete([]);
    }
  };

  const handleSelectRow = ({ name, value }) => {
    setEntriesToDelete(prev => {
      if (value) {
        return prev.concat(name);
      }

      return prev.filter(id => id !== name);
    });
  };

  return (
    <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT}>
      <TableHead
        areAllEntriesSelected={areAllEntriesSelected}
        entriesToDelete={entriesToDelete}
        headers={headers}
        onSelectAll={handleSelectAll}
        withMainAction={withMainAction}
        withBulkActions={withBulkActions}
      />
      {!rows.length ? (
        <EmptyBodyTable colSpan={COL_COUNT} content={content} />
      ) : (
        <TableRows
          canDelete={canDelete}
          canUpdate={canUpdate}
          entriesToDelete={entriesToDelete}
          headers={headers}
          onSelectRow={handleSelectRow}
          rows={rows}
          withBulkActions={withBulkActions}
          withMainAction={withMainAction}
        />
      )}
    </TableCompo>
  );
};

Table.defaultProps = {
  headers: [],
  rows: [],
  withBulkActions: false,
  withMainAction: false,
};

Table.propTypes = {
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  headers: PropTypes.array,
  rows: PropTypes.array,
  withBulkActions: PropTypes.bool,
  withMainAction: PropTypes.bool,
};

export default Table;
