import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useHistory } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { upperFirst } from 'lodash';
import { LoadingIndicator } from 'strapi-helper-plugin';
import useListView from '../../hooks/useListView';
import TableHeader from './TableHeader';
import { LoadingContainer, LoadingWrapper, Table, TableEmpty, TableRow } from './styledComponents';
import ActionCollapse from './ActionCollapse';
import Row from './Row';

const CustomTable = ({ canUpdate, canDelete, data, headers, isBulkable, showLoader }) => {
  const { emitEvent, entriesToDelete, label, filters, _q } = useListView();
  const { pathname } = useLocation();
  const { push } = useHistory();

  const colSpanLength = isBulkable && canDelete ? headers.length + 2 : headers.length + 1;

  const handleGoTo = id => {
    emitEvent('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
    });
  };

  const values = { contentType: upperFirst(label), search: _q };
  let tableEmptyMsgId = filters.length > 0 ? 'withFilters' : 'withoutFilter';

  if (_q !== '') {
    tableEmptyMsgId = 'withSearch';
  }

  const content =
    data.length === 0 ? (
      <TableEmpty>
        <td colSpan={colSpanLength}>
          <FormattedMessage
            id={`content-manager.components.TableEmpty.${tableEmptyMsgId}`}
            values={values}
          />
        </td>
      </TableEmpty>
    ) : (
      data.map(row => {
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
              canDelete={canDelete}
              canUpdate={canUpdate}
              isBulkable={isBulkable && canDelete}
              headers={headers}
              row={row}
              goTo={handleGoTo}
            />
          </TableRow>
        );
      })
    );

  if (showLoader) {
    return (
      <>
        <Table className="table">
          <TableHeader headers={headers} isBulkable={isBulkable && canDelete} />
        </Table>
        <LoadingWrapper>
          <LoadingContainer>
            <LoadingIndicator />
          </LoadingContainer>
        </LoadingWrapper>
      </>
    );
  }

  return (
    <Table className="table">
      <TableHeader headers={headers} isBulkable={isBulkable && canDelete} />
      <tbody>
        {entriesToDelete.length > 0 && <ActionCollapse colSpan={colSpanLength} />}
        {content}
      </tbody>
    </Table>
  );
};

CustomTable.defaultProps = {
  canDelete: false,
  canUpdate: false,
  data: [],
  headers: [],
  isBulkable: true,
  showLoader: false,
};

CustomTable.propTypes = {
  canDelete: PropTypes.bool,
  canUpdate: PropTypes.bool,
  data: PropTypes.array,
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
  showLoader: PropTypes.bool,
};

export default memo(CustomTable);
