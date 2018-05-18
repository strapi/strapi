/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { cloneDeep, get } from 'lodash';

import InputCheckbox from 'components/InputCheckbox/Loadable';
import InputDate from 'components/InputDate/Loadable';
import InputNumber from 'components/InputNumber/Loadable';
import InputSelect from 'components/InputSelect/Loadable';
import InputText from 'components/InputText/Loadable';

import Add from './Add';
import Div from './Div';
import Remove from './Remove';

import FILTER_TYPES from './filterTypes';

const getInputType = (attrType) => {
  switch (attrType) {
    case 'boolean':
      return InputCheckbox;
    case 'date':
    case 'datetime':
      return InputDate;
    case 'integer':
    case 'bigint':
    case 'decimal':
    case 'float':
      return InputNumber;
    default:
      return InputText;
  }
};

const defaultInputStyle = { height: '30px', width: '200px', marginRight: '10px' };

function FilterOptions({ filter, index, onChange, onClickAdd, onClickRemove, schema, showAddButton }) {
  const selectStyle = { minHeight: '30px', minWidth: '170px', maxWidth: '200px' };
  const attrType = get(schema, [filter.model, 'type'], 'string');
  const Input = getInputType(get(schema, [filter.model, 'type'], 'string'));
  const value = attrType === 'boolean' && typeof get(filter, 'value', '') !== 'boolean'?
    false : get(filter, 'value', '');
  const inputStyle = attrType === 'boolean' ?
    Object.assign(cloneDeep(defaultInputStyle), { paddingTop: '17px', width: '20px' })
    : defaultInputStyle;

  return (
    <Div>
      <Remove type="button" onClick={() => onClickRemove(index)} />
      <InputSelect
        onChange={onChange}
        name={`${index}.model`}
        value={get(filter, 'model', '')}
        selectOptions={Object.keys(schema)}
        style={selectStyle}
      />

      <InputSelect
        onChange={onChange}
        name={`${index}.filter`}
        value={get(filter, 'filter', '=')}
        selectOptions={FILTER_TYPES}
        style={{ minHeight: '30px', minWidth: '130px', maxWidth: '160px', marginLeft: '10px', marginRight: '10px' }}
      />

      <Input
        autoFocus={false}
        onChange={onChange}
        name={`${index}.value`}
        value={value}
        style={inputStyle}
      />

      {showAddButton && <Add type="button" onClick={onClickAdd} />}
    </Div>
  );
}

FilterOptions.defaultProps = {
  filter: {},
  index: 0,
  onChange: () => {},
  onClickAdd: () => {},
  onClickRemove: () => {},
  schema: {},
  showAddButton: false,
};

FilterOptions.propTypes = {
  filter: PropTypes.object,
  index: PropTypes.number,
  onChange: PropTypes.func,
  onClickAdd: PropTypes.func,
  onClickRemove: PropTypes.func,
  schema: PropTypes.object,
  showAddButton: PropTypes.bool,
};

export default FilterOptions;
