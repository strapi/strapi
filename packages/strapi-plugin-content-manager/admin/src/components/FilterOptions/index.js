/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

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
      return InputSelect;
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

const defaultInputStyle = { width: '210px', marginRight: '10px', paddingTop: '4px' };
const midSelectStyle = { minWidth: '130px', maxWidth: '200px', marginLeft: '10px', marginRight: '10px' };

function FilterOptions({ filter, index, onChange, onClickAdd, onClickRemove, schema, showAddButton }) {
  const selectStyle = { minWidth: '170px', maxWidth: '200px' };
  const attrType = get(schema, [filter.attr, 'type'], 'string');
  const Input = getInputType(get(schema, [filter.attr, 'type'], 'string'));
  const inputStyle = attrType === 'boolean' ?
    Object.assign(selectStyle, { minWidth: '100px'})
    : defaultInputStyle;

  // This component is needed in order to add the date icon inside the InputDate
  const Wrapper = get(schema, [filter.attr, 'type'], 'string') === 'date' ? InputWrapper : 'div';

  return (
    <Div borderLeft={!showAddButton || get(filter, 'value', '') !== ''}>
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
        style={midSelectStyle}
      />
      <Wrapper>
        <Input
          name={`${index}.value`}
          onChange={onChange}
          selectOptions={['true', 'false']}
          style={inputStyle}
          value={get(filter, 'value')}
        />
      </Wrapper>
      {showAddButton && (
        <Add
          onClick={onClickAdd}
          style={attrType === 'boolean' ? { marginLeft: '10px' } : {}}
          type="button"
        />
      )}
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
