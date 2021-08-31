import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { Select, Padded } from '@buffetjs/core';
import Button from '../../../FullWidthButton';
import { form, getInputValue } from './utils';
import { initialState, reducer } from './reducer';
import init from './init';
import Input from './Input';
import Wrapper from './Wrapper';

const Card = ({ onChange }) => {
  const [
    {
      modifiedData: { name, filter, value },
    },
    dispatch,
  ] = useReducer(reducer, initialState, init);

  const handleChangeName = ({ target: { value } }) => {
    dispatch({
      type: 'ON_CHANGE_NAME',
      value,
    });
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  const renderFiltersOptions = () => {
    return form[name].allowedFilters.map(filter => (
      <FormattedMessage id={filter.id} key={filter.id}>
        {msg => <option value={filter.value}>{msg}</option>}
      </FormattedMessage>
    ));
  };

  const handleSubmit = () => {
    onChange({ name, filter, value });

    dispatch({
      type: 'RESET_FORM',
    });
  };

  return (
    <Wrapper>
      <Padded bottom size="11px">
        <Select name="name" onChange={handleChangeName} options={Object.keys(form)} value={name} />
      </Padded>
      <Padded bottom size="11px">
        <Select
          onChange={handleChange}
          options={renderFiltersOptions()}
          name="filter"
          value={filter}
        />
      </Padded>
      <Padded bottom size="11px">
        <Input
          onChange={handleChange}
          name="value"
          type={form[name].type}
          value={getInputValue(form[name].type, value)}
          options={[
            { label: 'true', value: 'true' },
            { label: 'false', value: 'false' },
          ]}
        />
      </Padded>
      <Button icon onClick={handleSubmit} type="button">
        <FormattedMessage id="app.utils.add-filter" />
      </Button>
    </Wrapper>
  );
};

Card.defaultProps = {
  onChange: () => {},
};

Card.propTypes = {
  onChange: PropTypes.func,
};

export default Card;
