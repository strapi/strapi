import React from 'react';
import { get, isEmpty } from 'lodash';
import { InputSelect } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';
import { Button, InputWrapper, Wrapper } from './components';
import getFilters from './utils';
import Input from './Input';

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
  value,
  type,
}) {
  const filtersOptions = getFilters(type);

  return (
    <Wrapper borderLeft={!isEmpty(value)}>
      <InputWrapper>
        <Button type="button" isRemoveButton />
        <InputSelect
          onChange={onChange}
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
          selectOptions={['false', 'true', 'oo']}
          onChange={onChange}
        />
        <Button type="button" />
      </InputWrapper>
    </Wrapper>
  );
}

FilterPickerOption.defaultProps = {
  allowedAttributes: [],
  modifiedData: [],
  index: -1,
  onChange: () => {},
  value: null,
  type: 'string',
};

FilterPickerOption.propTypes = {
  allowedAttributes: PropTypes.array,
  modifiedData: PropTypes.array,
  index: PropTypes.number,
  onChange: PropTypes.func,
  value: PropTypes.any,
  type: PropTypes.string,
};

export default FilterPickerOption;
