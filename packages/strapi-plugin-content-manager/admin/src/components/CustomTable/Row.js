import React, { memo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isNull, isObject, toLower, toString } from 'lodash';
import moment from 'moment';
import { useGlobalContext } from 'strapi-helper-plugin';
import { IconLinks } from '@buffetjs/core';
import { Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useListView } from '../../hooks';
import dateFormats from '../../utils/dateFormats';
import CustomInputCheckbox from '../CustomInputCheckbox';
import { ActionContainer } from './styledComponents';
import RowCell from './RowCell';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

const getDisplayedValue = (type, value, name) => {
  switch (toLower(type)) {
    case 'string':
    case 'text':
    case 'email':
    case 'enumeration':
    case 'uid':
      return (value && !isEmpty(toString(value))) || name === 'id' ? toString(value) : '-';
    case 'float':
    case 'integer':
    case 'biginteger':
    case 'decimal':
      return !isNull(value) ? toString(value) : '-';
    case 'boolean':
      return value !== null ? toString(value) : '-';
    case 'date':
    case 'datetime':
    case 'timestamp': {
      if (value == null) {
        return '-';
      }

      const date =
        value && isObject(value) && value._isAMomentObject === true ? JSON.stringify(value) : value;

      return moment(date).format(dateFormats[type]);
    }
    case 'password':
      return '••••••••';
    case 'media':
    case 'file':
    case 'files':
      return value;
    case 'time': {
      if (!value) {
        return '-';
      }

      const [hour, minute, second] = value.split(':');
      const timeObj = {
        hour,
        minute,
        second,
      };
      const date = moment().set(timeObj);

      return date.format(dateFormats.time);
    }
    case 'relation': {
      return value;
    }
    default:
      return '-';
  }
};

function Row({ canCreate, canDelete, canUpdate, isBulkable, row, headers, goTo }) {
  const { entriesToDelete, onChangeBulk, onClickDelete } = useListView();
  const { emitEvent } = useGlobalContext();
  const emitEventRef = useRef(emitEvent);

  const memoizedDisplayedValue = useCallback(
    (name, type) => {
      return getDisplayedValue(type, row[name], name);
    },
    [row]
  );

  const links = [
    {
      icon: canCreate ? <Duplicate fill="black" /> : null,
      onClick: e => {
        e.stopPropagation();
        goTo(`create/clone/${row.id}`);
      },
    },
    {
      icon: canUpdate ? <FontAwesomeIcon icon="pencil-alt" /> : null,
      onClick: e => {
        e.stopPropagation();
        emitEventRef.current('willDeleteEntryFromList');
        goTo(row.id);
      },
    },
    {
      icon: canDelete ? <FontAwesomeIcon icon="trash-alt" /> : null,
      onClick: e => {
        e.stopPropagation();
        emitEventRef.current('willDeleteEntryFromList');
        onClickDelete(row.id);
      },
    },
  ].filter(icon => icon);

  return (
    <>
      {isBulkable && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
        <td key="i" onClick={e => e.stopPropagation()}>
          <CustomInputCheckbox
            name={row.id}
            onChange={onChangeBulk}
            value={entriesToDelete.filter(id => toString(id) === toString(row.id)).length > 0}
          />
        </td>
      )}
      {headers.map(({ key, name, fieldSchema: { type }, cellFormatter, metadatas }) => (
        <td key={key}>
          {cellFormatter ? (
            cellFormatter(row)
          ) : (
            <RowCell type={type} metadatas={metadatas} value={memoizedDisplayedValue(name, type)} />
          )}
        </td>
      ))}
      <ActionContainer>
        <IconLinks links={links} />
      </ActionContainer>
    </>
  );
}

Row.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canUpdate: PropTypes.bool.isRequired,
  headers: PropTypes.array.isRequired,
  isBulkable: PropTypes.bool.isRequired,
  row: PropTypes.object.isRequired,
  goTo: PropTypes.func.isRequired,
};

export default memo(Row);
