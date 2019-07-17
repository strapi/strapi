import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty } from 'lodash';

import Select from 'react-select';

function SelectMany({
  addRelation,
  mainField,
  name,
  isLoading,
  onInputChange,
  onMenuClose,
  onMenuScrollToBottom,
  options,
  placeholder,
  value,
}) {
  return (
    <>
      <Select
        id={name}
        filterOption={el => {
          if (isEmpty(value)) {
            return true;
          }

          return value.findIndex(obj => obj.id === el.value.id) === -1;
        }}
        isLoading={isLoading}
        isMulti
        isSearchable
        options={options}
        onChange={addRelation}
        onInputChange={onInputChange}
        onMenuClose={onMenuClose}
        onMenuScrollToBottom={onMenuScrollToBottom}
        placeholder={placeholder}
        value={[]}
      />
      {!isEmpty(value) && (
        <ul>
          {value.map(v => (
            <li key={v.id}>{get(v, [mainField], '')}</li>
          ))}
        </ul>
      )}
    </>
  );
}

SelectMany.defaultProps = {
  value: null,
};

SelectMany.propTypes = {
  addRelation: PropTypes.func.isRequired,
  mainField: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onMenuClose: PropTypes.func.isRequired,
  onMenuScrollToBottom: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  placeholder: PropTypes.node.isRequired,
  value: PropTypes.array,
};

export default SelectMany;
