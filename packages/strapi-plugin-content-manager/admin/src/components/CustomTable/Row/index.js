import React, { memo, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { toString } from 'lodash';
import { useGlobalContext } from 'strapi-helper-plugin';
import { IconLinks } from '@buffetjs/core';
import { Duplicate } from '@buffetjs/icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useListView } from '../../../hooks';
import { getDisplayedValue } from '../../../utils';
import CustomInputCheckbox from '../../CustomInputCheckbox';
import ActionContainer from './ActionContainer';
import Cell from './Cell';

/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */

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
      {headers.map(
        ({
          key,
          name,
          fieldSchema: { type, relationType },
          cellFormatter,
          metadatas,
          queryInfos,
        }) => (
          <td key={key}>
            {cellFormatter ? (
              cellFormatter(row)
            ) : (
              <Cell
                options={{
                  rowId: row.id,
                  relationType,
                  type,
                  name,
                  value: memoizedDisplayedValue(name, type),
                  cellId: key,
                  metadatas,
                  queryInfos,
                }}
              />
            )}
          </td>
        )
      )}
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
