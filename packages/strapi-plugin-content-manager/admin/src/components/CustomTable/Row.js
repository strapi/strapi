import React, { memo } from 'react';
import { withRouter } from 'react-router';
import PropTypes from 'prop-types';
import { get, isEmpty, isNull, isObject, toLower, toString } from 'lodash';
import moment from 'moment';
import { IcoContainer } from 'strapi-helper-plugin';
import { useListView } from '../../contexts/ListView';

import CustomInputCheckbox from '../CustomInputCheckbox';

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
        .format('YYYY-MM-DD HH:mm:ss');
    }
    case 'password':
      return '••••••••';
    default:
      return '-';
  }
};

function Row({ goTo, isBulkable, row, headers }) {
  const {
    entriesToDelete,
    onChangeBulk,
    onClickDelete,
    schema,
  } = useListView();

  return (
    <>
      {isBulkable && (
        <td key="i" onClick={e => e.stopPropagation()}>
          <CustomInputCheckbox
            name={row.id}
            onChange={onChangeBulk}
            value={
              entriesToDelete.filter(id => toString(id) === toString(row.id))
                .length > 0
            }
          />
        </td>
      )}
      {headers.map(header => {
        return (
          <td key={header.name}>
            <Truncate>
              <Truncated>
                {getDisplayedValue(
                  get(schema, ['attributes', header.name, 'type'], 'string'),
                  row[header.name],
                  header.name
                )}
              </Truncated>
            </Truncate>
          </td>
        );
      })}
      <ActionContainer>
        <IcoContainer
          icons={[
            {
              icoType: 'pencil',
              onClick: () => {
                goTo(row.id);
              },
            },
            {
              id: row.id,
              icoType: 'trash',
              onClick: () => {
                onClickDelete(row.id);
              },
            },
          ]}
        />
      </ActionContainer>
    </>
  );
}

Row.propTypes = {
  goTo: PropTypes.func.isRequired,
  headers: PropTypes.array.isRequired,
  isBulkable: PropTypes.bool.isRequired,
  row: PropTypes.object.isRequired,
};

export default withRouter(memo(Row));
