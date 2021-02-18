import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Select } from '@buffetjs/core';
import { getFilterType, useGlobalContext } from 'strapi-helper-plugin';
import { getTrad, getFileModelTimestamps } from '../../../utils';
import init from './init';
import reducer, { initialState } from './reducer';

import Wrapper from './Wrapper';
import InputWrapper from './InputWrapper';
import FilterButton from './FilterButton';
import FilterInput from './FilterInput';

const FiltersCard = ({ onChange }) => {
  const { plugins } = useGlobalContext();
  const timestamps = getFileModelTimestamps(plugins);
  const [state, dispatch] = useReducer(reducer, initialState, () => init(initialState, timestamps));
  const { name, filter, filtersForm, value } = state.toJS();

  const type = filtersForm[name].type;
  const filtersOptions = getFilterType(type);
  const options = ['image', 'video', 'file'];

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      name,
      value,
      defaultValue: value === 'mime' ? options[0] : null,
    });
  };

  const addFilter = () => {
    onChange({ target: { value: { name, filter, value } } });

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

  const renderNamesOptions = () => {
    return Object.keys(filtersForm).map(key => {
      return (
        <option key={key} value={key}>
          {key === 'mime' ? 'type' : key}
        </option>
      );
    });
  };

  return (
    <Wrapper>
      <InputWrapper>
        <Select onChange={handleChange} name="name" options={renderNamesOptions()} value={name} />
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
          options={options}
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
