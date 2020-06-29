import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import Select from 'react-select';
import { useIntl } from 'react-intl';
import { intersectionWith, differenceWith } from 'lodash';

import { usePermissionsContext } from '../../../../../../../src/hooks';
import SingleValue from './SingleValue';
import MenuList from './MenuList';
import selectStyle from './selectStyle';

const Wrapper = styled.div`
  padding-left: 30px;
  width: 60%;
`;

const ConditionSelect = ({ onChange, value }) => {
  console.log(onChange, value);
  const { permissionsLayout } = usePermissionsContext();
  const { formatMessage } = useIntl();
  const [values, setValues] = useState([]);

  const handleChange = action => {
    const hasValue = values.findIndex(option => option.id === action.id) !== -1;

    if (hasValue) {
      setValues(values.filter(val => val.id !== action.id));
    } else {
      setValues([...values, action]);
    }
  };

  const handleCategoryChange = categoryActions => {
    const missingActions = intersectionWith(
      values,
      categoryActions,
      (val, catAction) => val.id === catAction.id
    );
    const hasAllValue = missingActions.length === categoryActions.length;

    if (hasAllValue) {
      setValues(
        differenceWith(values, categoryActions, (val, catAction) => val.id === catAction.id)
      );
    } else {
      setValues([
        ...differenceWith(values, categoryActions, (val, catAction) => val.id === catAction.id),
        ...categoryActions,
      ]);
    }
  };

  return (
    <Wrapper orMessage={formatMessage({ id: 'Settings.permissions.conditions.or' })}>
      <Select
        components={{
          SingleValue,
          MenuList,
        }}
        // menuIsOpen
        classNamePrefix="condition-select"
        onChange={handleChange}
        isClearable={false}
        isLoading={false}
        closeMenuOnSelect={false}
        isSearchable={false}
        hideSelectedOptions={false}
        onCategoryChange={handleCategoryChange}
        defaultValue={{
          displayName: 'Anytime',
          id: 'anytime',
        }}
        options={[
          ...permissionsLayout.conditions,
          ...[
            { displayName: 'blabla', category: 'default2', id: 'blabla' },
            { displayName: 'blabla2', category: 'default2', id: 'blabla2' },
            { displayName: 'blabla3', category: 'default2', id: 'blabla3' },
            { displayName: 'blabla4', category: 'default2', id: 'blabla4' },
            { displayName: 'blabla5', category: 'default2', id: 'blabla5' },
          ],
        ]}
        getOptionValue={option => option.id}
        styles={selectStyle}
        value={values}
      />
    </Wrapper>
  );
};

ConditionSelect.defaultProps = {
  value: null,
};

ConditionSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default ConditionSelect;
