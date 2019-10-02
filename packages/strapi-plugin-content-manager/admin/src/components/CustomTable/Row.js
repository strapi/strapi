import React, { memo, useCallback } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { get, isEmpty, isNull, isObject, toLower, toString } from 'lodash';
import moment from 'moment';
import { IcoContainer } from 'strapi-helper-plugin';
import { useListView } from '../../contexts/ListView';

import CustomInputCheckbox from '../CustomInputCheckbox';
import MediaPreviewList from '../MediaPreviewList';

import { ActionContainer, Truncate, Truncated } from './styledComponents';

const getDisplayedValue = (type, value, name) => {
  switch (toLower(type)) {
    case 'string':
    case 'text':
    case 'email':
    case 'enumeration':
      return (value && !isEmpty(toString(value))) || name === 'id'
        ? toString(value)
        : '-';
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
      return !isNull(value) ? toString(value) : '-';
    case 'boolean':
      return value !== null ? toString(value) : '-';
    case 'date':
    case 'time':
    case 'datetime':
    case 'timestamp': {
      if (value === null) {
        return '-';
      }

      const date =
        value && isObject(value) && value._isAMomentObject === true
          ? JSON.stringify(value)
          : value;

      return moment
        .parseZone(date)
        .utc()
        .format('dddd, MMMM Do YYYY');
    }
    case 'password':
      return '••••••••';
    case 'media':
    case 'file':
    case 'files':
      return value;
    default:
      return '-';
  }
};

function Row({ goTo, isBulkable, row, headers, idAttribute }) {
  const {
    entriesToDelete,
    onChangeBulk,
    onClickDelete,
    schema,
  } = useListView();

  const memoizedDisplayedValue = useCallback(
    name => {
      const type = get(schema, ['attributes', name, 'type'], 'string');

      return getDisplayedValue(type, row[name], name);
    },
    [row, schema]
  );

  return (
    <>
      {isBulkable && (
        <td key="i" onClick={e => e.stopPropagation()}>
          <CustomInputCheckbox
            name={row[idAttribute]}
            onChange={onChangeBulk}
            value={
              entriesToDelete.filter(
                id => toString(id) === toString(row[idAttribute])
              ).length > 0
            }
          />
        </td>
      )}
      {headers.map(header => {
        return (
          <td key={header.name}>
            {get(schema, ['attributes', header.name, 'type']) !== 'media' ? (
              <Truncate>
                <Truncated>{memoizedDisplayedValue(header.name)}</Truncated>
              </Truncate>
            ) : (
              <MediaPreviewList
                files={memoizedDisplayedValue(header.name)}
              ></MediaPreviewList>
            )}
          </td>
        );
      })}
      <ActionContainer>
        <IcoContainer
          style={{ minWidth: 'inherit', width: '100%' }}
          icons={[
            {
              icoType: 'pencil',
              onClick: () => {
                goTo(row[idAttribute]);
              },
            },
            {
              id: row.id,
              icoType: 'trash',
              onClick: () => {
                onClickDelete(row[idAttribute]);
              },
            },
          ]}
        />
      </ActionContainer>
    </>
  );
}

Row.defaultProps = {
  idAttribute: 'id',
};

Row.propTypes = {
  goTo: PropTypes.func.isRequired,
  headers: PropTypes.array.isRequired,
  isBulkable: PropTypes.bool.isRequired,
  row: PropTypes.object.isRequired,
  idAttribute: PropTypes.string,
};

export default withRouter(memo(Row));
