/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';

import InputSelect from 'components/InputSelect/Loadable';

import Add from './Add';
import Div from './Div';
import InputWithAutoFocus from './InputWithAutoFocus';
import InputWrapper from './InputWrapper';
import Remove from './Remove';

import FILTER_TYPES from './filterTypes';

const defaultInputStyle = { width: '210px', marginRight: '10px', paddingTop: '4px' };
const midSelectStyle = { minWidth: '130px', maxWidth: '200px', marginLeft: '10px', marginRight: '10px' };

function FilterOptions({ filter, filterToFocus, index, onChange, onClickAdd, onClickRemove, schema, show, showAddButton }) {
  const selectStyle = { minWidth: '170px', maxWidth: '200px' };
  const attrType = get(schema, [filter.attr, 'type'], 'string');
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
        {show && (
          <InputWithAutoFocus
            filter={filter}
            filterToFocus={filterToFocus}
            index={index}
            inputStyle={inputStyle}
            name={`${index}.value`}
            onChange={onChange}
            schema={schema}
            style={inputStyle}
            value={get(filter, 'value')}
          />
        )}
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
  filterToFocus: null,
  index: 0,
  onChange: () => {},
  onClickAdd: () => {},
  onClickRemove: () => {},
  schema: {},
  show: false,
  showAddButton: false,
};

FilterOptions.propTypes = {
  filter: PropTypes.object,
  filterToFocus: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.number,
  ]),
  index: PropTypes.number,
  onChange: PropTypes.func,
  onClickAdd: PropTypes.func,
  onClickRemove: PropTypes.func,
  schema: PropTypes.object,
  show: PropTypes.bool,
  showAddButton: PropTypes.bool,
};

export default FilterOptions;
