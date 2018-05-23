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
import InputWrapper from './InputWrapper';
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

const defaultInputStyle = { width: '210px', marginRight: '10px', paddingTop: '9px' };

function FilterOptions({ filter, index, onChange, onClickAdd, onClickRemove, schema, showAddButton }) {
  const selectStyle = { minWidth: '170px', maxWidth: '200px' };
  const attrType = get(schema, [filter.attr, 'type'], 'string');
  const Input = getInputType(get(schema, [filter.attr, 'type'], 'string'));
  const value = attrType === 'boolean' && typeof get(filter, 'value', '') !== 'boolean'?
    false : get(filter, 'value', '');
  const inputStyle = attrType === 'boolean' ?
    Object.assign(cloneDeep(defaultInputStyle), { paddingTop: '17px', width: '20px' })
    : defaultInputStyle;

  // This component is needed in order to add the date icon inside the InputDate
  const Wrapper = get(schema, [filter.attr, 'type'], 'string') === 'date' ? InputWrapper : 'div';

  return (
    <Div borderLeft={!showAddButton || value !== ''}>
      <Remove type="button" onClick={() => onClickRemove(index)} />
      <InputSelect
        onChange={onChange}
        name={`${index}.attr`}
        value={get(filter, 'attr', '')}
        selectOptions={Object.keys(schema)}
        style={selectStyle}
      />

      <InputSelect
        onChange={onChange}
        name={`${index}.filter`}
        value={get(filter, 'filter', '=')}
        selectOptions={FILTER_TYPES}
        style={{ minWidth: '130px', maxWidth: '200px', marginLeft: '10px', marginRight: '10px' }}
      />
      <Wrapper>
        <Input
          autoFocus={false}
          onChange={onChange}
          name={`${index}.value`}
          value={value}
          style={inputStyle}
        />
      </Wrapper>

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
