import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import { Select } from '@buffetjs/core';
import { getFilterType } from 'strapi-helper-plugin';
import getTrad from '../../../utils/getTrad';

import reducer, { initialState } from './reducer';

import filters from './utils/filtersForm';

import Wrapper from './Wrapper';
import InputWrapper from './InputWrapper';
import FilterButton from './FilterButton';
import FilterInput from './FilterInput';

const FiltersCard = ({ onChange }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const { name, filter, value } = state.toJS();

  const type = filters[name].type;
  const filtersOptions = getFilterType(type);

  const getDefaultValue = name => filters[name].defaultValue;

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      name,
      value,
      defaultValue: filters[value] ? getDefaultValue(value) : null,
    });
  };

  const addFilter = () => {
    onChange({ target: { value: state.toJS() } });

    dispatch({
      type: 'RESET_FORM',
    });
  };

  const renderFiltersOptions = () => {
    return filtersOptions.map(({ id, value }) => (
      <FormattedMessage id={id} key={id}>
        {msg => <option value={value}>{msg}</option>}
      </FormattedMessage>
    ));
  };

  return (
    <Wrapper>
      <InputWrapper>
        <Select onChange={handleChange} name="name" options={Object.keys(filters)} value={name} />
      </InputWrapper>
      <InputWrapper>
        <Select
          onChange={handleChange}
          name="filter"
          options={renderFiltersOptions()}
          value={filter}
        />
      </InputWrapper>
      <InputWrapper>
        <FilterInput
          type={type}
          onChange={handleChange}
          name="value"
          options={['image', 'video', 'files']}
          value={value}
        />
      </InputWrapper>
      <FilterButton icon onClick={addFilter}>
        <FormattedMessage id={getTrad('filter.add')} />
      </FilterButton>
    </Wrapper>
  );
};

FiltersCard.defaultProps = {
  onChange: () => {},
};

FiltersCard.propTypes = {
  onChange: PropTypes.func,
};

export default FiltersCard;
