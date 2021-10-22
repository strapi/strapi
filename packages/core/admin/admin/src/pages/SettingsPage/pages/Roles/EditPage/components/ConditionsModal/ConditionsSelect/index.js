import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Select from 'react-select';
import { useIntl } from 'react-intl';
import MenuList from './MenuList';
import ClearIndicator from './ClearIndicator';
import DropdownIndicator from './CustomDropdownIndicator';
import IndicatorSeparator from './IndicatorSeparator';
import SingleValue from './SingleValue';
import selectStyle from '../utils/selectStyle';

const Wrapper = styled.div`
  padding-left: ${({ theme }) => theme.main.sizes.paddings.md};
  width: 60%;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'default')};
`;

const ConditionsSelect = ({
  arrayOfOptionsGroupedByCategory,
  isFormDisabled,
  name,
  onCategoryChange,
  onChange,
  value,
}) => {
  const { formatMessage } = useIntl();

  return (
    <Wrapper disabled={isFormDisabled}>
      <Select
        components={{
          ClearIndicator,
          DropdownIndicator,
          IndicatorSeparator,
          SingleValue,
          MenuList,
        }}
        arrayOfOptionsGroupedByCategory={arrayOfOptionsGroupedByCategory}
        isDisabled={isFormDisabled}
        name={name}
        onChange={onChange}
        isClearable={false}
        isLoading={false}
        closeMenuOnSelect={false}
        isSearchable={false}
        hideSelectedOptions={false}
        placeholder={formatMessage({ id: 'Settings.permissions.conditions.anytime' })}
        onCategoryChange={onCategoryChange}
        options={[]}
        styles={selectStyle}
        value={value}
      />
    </Wrapper>
  );
};

ConditionsSelect.propTypes = {
  arrayOfOptionsGroupedByCategory: PropTypes.array.isRequired,
  isFormDisabled: PropTypes.bool.isRequired,
  name: PropTypes.string.isRequired,
  onCategoryChange: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.object.isRequired,
};

export default ConditionsSelect;
