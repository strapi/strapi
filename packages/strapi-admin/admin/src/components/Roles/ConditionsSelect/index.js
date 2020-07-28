import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Select from 'react-select';
import { useIntl } from 'react-intl';
import { intersectionWith, differenceWith } from 'lodash';
import MenuList from 'ee_else_ce/components/Roles/ConditionsSelect/MenuList';
import ClearIndicator from './ClearIndicator';
import DropdownIndicator from './CustomDropdownIndicator';
import IndicatorSeparator from './IndicatorSeparator';

import { usePermissionsContext } from '../../../hooks';
import SingleValue from './SingleValue';
import selectStyle from './selectStyle';

const Wrapper = styled.div`
  padding-left: 30px;
  width: 60%;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'default')};
`;

const ConditionsSelect = ({ onChange, value }) => {
  const { isSuperAdmin, permissionsLayout } = usePermissionsContext();
  const { formatMessage } = useIntl();

  const handleChange = action => {
    const hasValue = value.findIndex(option => option === action) !== -1;

    if (hasValue) {
      onChange(value.filter(val => val !== action));
    } else {
      onChange([...value, action]);
    }
  };

  const handleCategoryChange = categoryActions => {
    const missingActions = intersectionWith(
      value,
      categoryActions,
      (val, catAction) => val === catAction
    );
    const hasAllValue = missingActions.length === categoryActions.length;

    if (hasAllValue) {
      onChange(differenceWith(value, categoryActions, (val, catAction) => val === catAction));
    } else {
      onChange([
        ...differenceWith(value, categoryActions, (val, catAction) => val === catAction),
        ...categoryActions,
      ]);
    }
  };

  return (
    <Wrapper disabled={isSuperAdmin}>
      <Select
        components={{
          ClearIndicator,
          DropdownIndicator,
          IndicatorSeparator,
          SingleValue,
          MenuList,
        }}
        isDisabled={isSuperAdmin}
        onChange={handleChange}
        isClearable={false}
        isLoading={false}
        closeMenuOnSelect={false}
        isSearchable={false}
        hideSelectedOptions={false}
        placeholder={formatMessage({ id: 'Settings.permissions.conditions.anytime' })}
        onCategoryChange={handleCategoryChange}
        options={permissionsLayout.conditions}
        styles={selectStyle}
        value={value}
      />
    </Wrapper>
  );
};

ConditionsSelect.defaultProps = {
  value: null,
};

ConditionsSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array,
};

export default ConditionsSelect;
