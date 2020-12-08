import React, { memo, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useLocation, useHistory } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { upperFirst, isEmpty } from 'lodash';
import { LoadingIndicator, useGlobalContext } from 'strapi-helper-plugin';
import useListView from '../../hooks/useListView';
import { getTrad } from '../../utils';
import State from '../State';
import { LoadingContainer, LoadingWrapper, Table, TableEmpty, TableRow } from './styledComponents';
import ActionCollapse from './ActionCollapse';
import Headers from './Headers';
import Row from './Row';

const CustomTable = ({
  canCreate,
  canUpdate,
  canDelete,
  data,
  displayedHeaders,
  hasDraftAndPublish,
  isBulkable,
  showLoader,
}) => {
  const { formatMessage } = useIntl();
  const { entriesToDelete, label, filters, _q } = useListView();
  const { emitEvent } = useGlobalContext();

  const { pathname } = useLocation();
  const { push } = useHistory();
  const headers = useMemo(() => {
    if (hasDraftAndPublish) {
      return [
        ...displayedHeaders,
        {
          key: '__published_at_temp_key__',
          name: 'published_at',
          fieldSchema: {
            type: 'custom',
          },
          metadatas: {
            label: formatMessage({ id: getTrad('containers.ListPage.table-headers.published_at') }),
            searchable: false,
            sortable: true,
          },
          cellFormatter: cellData => {
            const isPublished = !isEmpty(cellData.published_at);

            return <State isPublished={isPublished} />;
          },
        },
      ];
    }

    return displayedHeaders;
  }, [formatMessage, hasDraftAndPublish, displayedHeaders]);

  const colSpanLength = isBulkable && canDelete ? headers.length + 2 : headers.length + 1;

  const handleRowGoTo = id => {
    emitEvent('willEditEntryFromList');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
    });
  };
  const handleEditGoTo = id => {
    emitEvent('willEditEntryFromButton');
    push({
      pathname: `${pathname}/${id}`,
      state: { from: pathname },
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

              handleRowGoTo(row.id);
            }}
          >
            <Row
              canCreate={canCreate}
              canDelete={canDelete}
              canUpdate={canUpdate}
              isBulkable={isBulkable && canDelete}
              headers={headers}
              row={row}
              goTo={handleEditGoTo}
            />
          </TableRow>
        );
      })
    );

  if (showLoader) {
    return (
      <>
        <Table className="table">
          <Headers headers={headers} isBulkable={isBulkable && canDelete} />
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
      <Headers headers={headers} isBulkable={isBulkable && canDelete} />
      <tbody>
        {entriesToDelete.length > 0 && <ActionCollapse colSpan={colSpanLength} />}
        {content}
      </tbody>
    </Table>
  );
};

CustomTable.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  data: PropTypes.array.isRequired,
  displayedHeaders: PropTypes.array.isRequired,
  hasDraftAndPublish: PropTypes.bool.isRequired,
  isBulkable: PropTypes.bool.isRequired,
  showLoader: PropTypes.bool.isRequired,
};

export default memo(CustomTable);
