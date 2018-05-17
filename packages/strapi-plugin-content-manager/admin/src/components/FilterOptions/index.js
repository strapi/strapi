/**
 *
 * FilterOptions
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';

import InputSelect from 'components/InputSelect';
import InputText from 'components/InputText';

import Add from './Add';
import Div from './Div';
import Remove from './Remove';

const FILTER_TYPES = [
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.equals',
    value: '=',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.not_equals',
    value: '_ne',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.lower',
    value: '_lt',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.lower_equal',
    value: '_lte',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.greater',
    value: '_gt',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.greater_equal',
    value: '_gte',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.contains',
    value: '_contains',
  },
  {
    id: 'content-manager.components.FilterOptions.FILTER_TYPES.containss',
    value: '_containss',
  },
];

function FilterOptions() {
  return (
    <Div>
      <Remove type="button" />
      <InputSelect
        onChange={() => {}}
        name=""
        value=""
        selectOptions={[]}
        style={{ minHeight: '30px', minWidth: '170px', maxWidth: '200px' }}
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

      <Add type="button" />
    </Div>
  );
}

FilterOptions.defaultProps = {};

FilterOptions.propTypes = {};

export default FilterOptions;
