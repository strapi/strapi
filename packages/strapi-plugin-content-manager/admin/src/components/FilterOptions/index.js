/**
 *
 * FilterOptions
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { get } from 'lodash';
import cn from 'classnames';

import InputSelect from 'components/InputSelect/Loadable';

import Add from './Add';
import Div from './Div';
import InputWithAutoFocus from './InputWithAutoFocus';
import Remove from './Remove';
import styles from './styles.scss';

import getFilters from './filterTypes';

const defaultInputStyle = { width: '210px', marginRight: '10px', paddingTop: '4px' };
const midSelectStyle = { minWidth: '130px', maxWidth: '200px', marginLeft: '10px', marginRight: '10px' };

function FilterOptions({ filter, filterToFocus, index, onChange, onClickAdd, onClickRemove, schema, show, showAddButton }) {
  const selectStyle = { minWidth: '170px', maxWidth: '200px' };
  const attrType = get(schema, [filter.attr, 'type'], 'string');
  const inputStyle = attrType === 'boolean' ?
    Object.assign(selectStyle, { minWidth: '100px'})
    : defaultInputStyle;

  // This component is needed in order to add the date icon inside the InputDate
  const isDate = get(schema, [filter.attr, 'type'], 'string') === 'date';
  const isBool = get(schema, [filter.attr, 'type']) === 'boolean';
  const selectOptionsSchema = Object
    .keys(schema)
    .filter(x => schema[x].type !== 'json');

  return (
    <Div borderLeft={!showAddButton || get(filter, 'value', '') !== ''}>
      <div className={styles.filterOptionsWrapper}>
        <Remove type="button" onClick={() => onClickRemove(index)} />
        <InputSelect
          onChange={onChange}
          name={`${index}.attr`}
          value={get(filter, 'attr', '')}
          selectOptions={selectOptionsSchema}
          style={selectStyle}
        />
        <InputSelect
          onChange={onChange}
          name={`${index}.filter`}
          value={get(filter, 'filter', '=')}
          selectOptions={getFilters(attrType)}
          style={midSelectStyle}
        />
        <div className={cn(isDate ? styles.filterOptionsInputWrapper : '')}>
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
        </div>
        {showAddButton && (
          <Add
            id="newFilter"
            onClick={onClickAdd}
            style={{ marginLeft: isBool? '14px': '6px' }}
            type="button"
          />
        )}
      </div>
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
