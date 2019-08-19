import React, { memo } from 'react';
import { get, isEmpty } from 'lodash';
import PropTypes from 'prop-types';

import { InputSelect } from 'strapi-helper-plugin';
import { Button, InputWrapper, Wrapper } from './components';
import Input from './Input';
import getFilters from './utils';

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
  input: {
    width: '210px',
    marginRight: '10px',
    paddingTop: '4px',
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
  const filtersOptions = getFilters(type);

  return (
    <Wrapper borderLeft={!isEmpty(value)}>
      <InputWrapper>
        <Button
          type="button"
          isRemoveButton
          onClick={() => onRemoveFilter(index)}
        />
        <InputSelect
          onChange={e => {
            // Change the attribute
            onChange(e);
            // Change the default filter so it reset to the common one which is '='
            onChange({ target: { name: `${index}.filter`, value: '=' } });
          }}
          name={`${index}.name`}
          value={get(modifiedData, [index, 'name'], '')}
          selectOptions={allowedAttributes.map(attr => attr.name)}
          style={styles.select}
        />
        <InputSelect
          onChange={onChange}
          name={`${index}.filter`}
          selectOptions={filtersOptions}
          style={styles.selectMiddle}
          value={get(modifiedData, [index, 'filter'], '')}
        />
        <Input
          type={type}
          name={`${index}.value`}
          value={get(modifiedData, [index, 'value'], '')}
          selectOptions={['true', 'false']}
          onChange={onChange}
        />
        {showAddButton && <Button type="button" onClick={onClickAddFilter} />}
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
