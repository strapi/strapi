import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { FormattedMessage } from 'react-intl';
import pluginId from '../../pluginId';
import { useListView } from '../../contexts/ListView';
import TableHeader from './TableHeader';
import { Table, TableEmpty, TableRow } from './styledComponents';
import ActionCollapse from './ActionCollapse';
import Row from './Row';

function CustomTable({
  data,
  headers,
  history: {
    location: { pathname, search },
    push,
  },
  isBulkable,
}) {
  const { emitEvent, entriesToDelete, slug } = useListView();
  const redirectUrl = `redirectUrl=${pathname}${search}`;
  const values = { contentType: slug || 'entry' };
  const id = 'withoutFilter';
  const colSpanLength = isBulkable ? headers.length + 2 : headers.length + 1;
  const handleGoTo = id => {
    emitEvent('willEditEntry');
    push({
      pathname: `/plugins/${pluginId}/${slug}/${id}`,
      search: redirectUrl,
    });
  };
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
          <TableRow
            key={row.id}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              handleGoTo(row.id);
            }}
          >
            <Row
              isBulkable={isBulkable}
              headers={headers}
              row={row}
              goTo={handleGoTo}
            />
          </TableRow>
        );
      })
    );

  return (
    <Table className="table">
      <TableHeader headers={headers} isBulkable={isBulkable} />
      <tbody>
        {entriesToDelete.length > 0 && (
          <ActionCollapse colSpan={colSpanLength} />
        )}
        {content}
      </tbody>
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
  history: PropTypes.shape({
    location: PropTypes.shape({
      pathname: PropTypes.string,
      search: PropTypes.string,
    }),
    push: PropTypes.func.isRequired,
  }).isRequired,
  isBulkable: PropTypes.bool,
  slug: PropTypes.string,
};

export default withRouter(memo(CustomTable));
