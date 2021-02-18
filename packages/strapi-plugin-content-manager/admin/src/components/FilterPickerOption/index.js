import React, { memo } from 'react';
import { get, isEmpty } from 'lodash';
import PropTypes from 'prop-types';
import { CircleButton, getFilterType } from 'strapi-helper-plugin';
import { Select } from '@buffetjs/core';

import { InputWrapper, Wrapper } from './components';
import Input from './Input';
import Option from './Option';

const styles = {
  select: {
    minWidth: '170px',
    maxWidth: '200px',
  },
  selectMiddle: {
    minWidth: '130px',
    maxWidth: '200px',
    marginLeft: '10px',
    marginRight: '10px',
  },
};

function FilterPickerOption({
  allowedAttributes,
  modifiedData,
  index,
  onChange,
  onClickAddFilter,
  onRemoveFilter,
  value,
  showAddButton,
  type,
}) {
  const filtersOptions = getFilterType(type);
  const currentFilterName = get(modifiedData, [index, 'name'], '');
  const currentFilterData = allowedAttributes.find(attr => attr.name === currentFilterName);
  const options = get(currentFilterData, ['options'], null) || ['true', 'false'];

  return (
    <Wrapper borderLeft={!isEmpty(value)}>
      <InputWrapper>
        <CircleButton type="button" isRemoveButton onClick={() => onRemoveFilter(index)} />
        <Select
          onChange={e => {
            // Change the attribute
            onChange(e);
            // Change the default filter so it reset to the common one which is '='
            onChange({ target: { name: `${index}.filter`, value: '=' } });
          }}
          name={`${index}.name`}
          value={currentFilterName}
          options={allowedAttributes.map(attr => attr.name)}
          style={styles.select}
        />
        <Select
          onChange={onChange}
          name={`${index}.filter`}
          options={filtersOptions.map(option => (
            <Option {...option} key={option.value} />
          ))}
          style={styles.selectMiddle}
          value={get(modifiedData, [index, 'filter'], '')}
        />
        <Input
          type={type}
          name={`${index}.value`}
          value={get(modifiedData, [index, 'value'], '')}
          options={options}
          onChange={onChange}
        />
        {showAddButton && <CircleButton type="button" onClick={onClickAddFilter} />}
      </InputWrapper>
    </Wrapper>
  );
}

FilterPickerOption.defaultProps = {
  allowedAttributes: [],
  modifiedData: [],
  index: -1,
  onChange: () => {},
  onClickAddFilter: () => {},
  onRemoveFilter: () => {},
  value: null,
  type: 'string',
};

FilterPickerOption.propTypes = {
  allowedAttributes: PropTypes.array,
  modifiedData: PropTypes.array,
  index: PropTypes.number,
  onChange: PropTypes.func,
  onClickAddFilter: PropTypes.func,
  onRemoveFilter: PropTypes.func,
  showAddButton: PropTypes.bool.isRequired,
  type: PropTypes.string,
  value: PropTypes.any,
};

export default memo(FilterPickerOption);
