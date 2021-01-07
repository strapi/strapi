/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { useListView } from '../../../hooks';
import CustomInputCheckbox from '../../CustomInputCheckbox';
import Thead from './Thead';
import Header from './Header';

function Headers({ headers, isBulkable }) {
  const { data, entriesToDelete, onChangeBulkSelectall } = useListView();

  return (
    <Thead isBulkable={isBulkable}>
      <tr>
        {isBulkable && (
          <th>
            <CustomInputCheckbox
              entriesToDelete={entriesToDelete}
              isAll
              name="all"
              onChange={onChangeBulkSelectall}
              value={data.length === entriesToDelete.length && entriesToDelete.length > 0}
            />
          </th>
        )}
        {headers.map(({ key, name, fieldSchema, metadatas }) => {
          return <Header key={key} name={name} fieldSchema={fieldSchema} metadatas={metadatas} />;
        })}

        <th />
      </tr>
    </Thead>
  );
}

Headers.defaultProps = {
  isBulkable: true,
  headers: [],
};

Headers.propTypes = {
  headers: PropTypes.array,
  isBulkable: PropTypes.bool,
};

export default memo(Headers);
