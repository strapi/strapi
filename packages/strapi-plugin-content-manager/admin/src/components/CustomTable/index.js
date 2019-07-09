import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import { useListView } from '../../contexts/ListView';
import TableHeader from './TableHeader';
import { Table, TableEmpty, TableRow } from './styledComponents';
import Row from './Row';

function CustomTable({ data, headers, isBulkable }) {
  const { slug } = useListView();
  const values = { contentType: slug || 'entry' };
  const id = 'withoutFilter';
  const colSpanLength = isBulkable ? headers.length + 2 : headers.length + 1;
  const content =
    data.length === 0 ? (
      <TableEmpty>
        <td colSpan={colSpanLength}>
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
      <TableHeader headers={headers} isBulkable={isBulkable} />
      <tbody>{content}</tbody>
    </Table>
  );
}

CustomTable.defaultProps = {
  data: [],
  headers: [],
  isBulkable: true,
  slug: '',
};

CustomTable.propTypes = {
  data: PropTypes.array,
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
  slug: PropTypes.string,
};

export default memo(CustomTable);
