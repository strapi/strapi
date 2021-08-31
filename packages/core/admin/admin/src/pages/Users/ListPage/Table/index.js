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
  const COL_COUNT = 7;
  const hasFilters = query.filters !== undefined;

  const content = hasFilters
    ? {
        id: 'content-manager.components.TableEmpty.withFilters',
        defaultMessage: 'There are no {contentType} with the applied filters...',
        values: { contentType: 'Users' },
      }
    : undefined;

  return (
    <TableCompo colCount={COL_COUNT} rowCount={ROW_COUNT}>
      <TableHead
        headers={headers}
        withMainAction={withMainAction}
        withBulkActions={withBulkActions}
      />
      {!rows.length ? (
        <EmptyBodyTable colSpan={COL_COUNT} content={content} />
      ) : (
        <TableRows
          canDelete={canDelete}
          canUpdate={canUpdate}
          data={rows}
          headers={headers}
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
