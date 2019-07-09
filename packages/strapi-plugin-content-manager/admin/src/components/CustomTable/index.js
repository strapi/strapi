import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import TableHeader from './TableHeader';

import { Table, TableEmpty, TableRow } from './styledComponents';
import Row from './Row';

function CustomTable({
  data,
  defaultSortBy,
  defaultSortOrder,
  headers,
  isBulkable,
  onChangeParams,
  slug,
}) {
  const values = { contentType: slug || 'entry' };
  const id = 'withoutFilter';
  const content =
    data.length === 0 ? (
      <TableEmpty>
        <td colSpan={headers.length + 1}>
          <FormattedMessage
            id={`content-manager.components.TableEmpty.${id}`}
            values={values}
          />
        </td>
      </TableEmpty>
    ) : (
      data.map(row => {
        //
        return (
          <TableRow key={row.id}>
            <Row isBulkable={isBulkable} headers={headers} row={row} />
          </TableRow>
        );
      })
    );

  return (
    <Table className="table">
      <TableHeader
        defaultSortBy={defaultSortBy}
        defaultSortOrder={defaultSortOrder}
        headers={headers}
        isBulkable={isBulkable}
        onChangeParams={onChangeParams}
      />
      <tbody>{content}</tbody>
    </Table>
  );
}

CustomTable.defaultProps = {
  data: [],
  defaultSortBy: 'id',
  defaultSortOrder: 'ASC',
  headers: [],
  isBulkable: true,
  slug: '',
};

CustomTable.propTypes = {
  data: PropTypes.array,
  defaultSortBy: PropTypes.string,
  defaultSortOrder: PropTypes.string,
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
  onChangeParams: PropTypes.func.isRequired,
  slug: PropTypes.string,
};

export default memo(CustomTable);
