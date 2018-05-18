/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import InputSelect from 'components/InputSelect/Loadable';
import InputText from 'components/InputText/Loadable';

import Add from './Add';
import Div from './Div';
import Remove from './Remove';

import FILTER_TYPES from './filterTypes';

function FilterOptions({ filter, index, onClickAdd, onClickRemove, schema, showAddButton }) {
  const selectStyle = { minHeight: '30px', minWidth: '170px', maxWidth: '200px' };

  return (
    <Div>
      <Remove type="button" onClick={() => onClickRemove(index)} />
      <InputSelect
        onChange={() => {}}
        name="model"
        value={get(filter, 'model', '')}
        selectOptions={Object.keys(schema)}
        style={selectStyle}
      />

      <InputSelect
        onChange={() => {}}
        name=""
        value=""
        selectOptions={FILTER_TYPES}
        style={{ minHeight: '30px', minWidth: '130px', maxWidth: '160px', marginLeft: '10px', marginRight: '10px' }}
      />

      <InputText
        onChange={() => {}}
        name=""
        value="ezez"
        selectOptions={[]}
        style={{ height: '30px', width: '200px', marginRight: '10px' }}
      />

      {showAddButton && <Add type="button" onClick={onClickAdd} />}
    </Div>
  );
}

FilterOptions.defaultProps = {
  filter: {},
  index: 0,
  onClickAdd: () => {},
  onClickRemove: () => {},
  schema: {},
  showAddButton: false,
};

FilterOptions.propTypes = {
  filter: PropTypes.object,
  index: PropTypes.number,
  onClickAdd: PropTypes.func,
  onClickRemove: PropTypes.func,
  schema: PropTypes.object,
  showAddButton: PropTypes.bool,
};

export default FilterOptions;
