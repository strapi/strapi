import React, { useReducer, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Select } from '@buffetjs/core';

import { getFilterType, request } from 'strapi-helper-plugin';
import { getTrad } from '../../../utils';

import reducer, { initialState } from './reducer';

import Wrapper from './Wrapper';
import InputWrapper from './InputWrapper';
import FilterButton from './FilterButton';
import FilterInput from './FilterInput';

const FiltersCard = ({ onChange, filters }) => {
  // Not using the hook from buffet.js because it appears that when the component is closed we the hooks returns false
  // Until we make a PR on @buffetjs/hooks I rather use this custom one
  const isMounted = useRef(true);
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    if (isMounted.current) {
      fetchTimestampNames();
    }

    return () => (isMounted.current = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  const { name, filter, filtersForm, value } = state.toJS();
  const type = filtersForm[name].type;
  const filtersOptions = getFilterType(type);
  const options = ['image', 'video', 'file'].filter(
    f => !filters.find(e => e.value === f && e.isDisabled)
  );

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

  const fetchTimestampNames = async () => {
    try {
      const result = await request('/content-manager/content-types/plugins::upload.file', {
        method: 'GET',
      });

      if (isMounted.current) {
        dispatch({
          type: 'HANDLE_CUSTOM_TIMESTAMPS',
          timestamps: result.data.contentType.schema.options.timestamps,
        });
      }
    } catch (err) {
      if (isMounted.current) {
        strapi.notification.error('notification.error');
      }
    }
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
  filters: [],
  onChange: () => {},
};

FiltersCard.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
};

export default FiltersCard;
