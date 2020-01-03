/**
 *
 * Inputs
 */

import React from 'react';
import PropTypes from 'prop-types';

import { ErrorMessage, Label } from '@buffetjs/styles';
import { Error, InputText } from '@buffetjs/core';

import Wrapper from './Wrapper';
import HeadersInput from '../HeadersInput';

function Inputs({
  error: inputError,
  label,
  name,
  onChange,
  onClick,
  type,
  validations,
  value,
}) {
  const renderInput = ({ hasError, onBlur, handleChange }, type) => {
    if (type === 'headers') {
      return (
        <HeadersInput
          value={value}
          name={name}
          onClick={onClick}
          onChange={handleChange}
        />
      );
    } else if (type === 'events') {
      return <p>hooks</p>;
    } else {
      return (
        <InputText
          error={hasError}
          onBlur={onBlur}
          onChange={handleChange}
          value={value}
          name={name}
        />
      );
    }
  };

  return (
    <Error
      inputError={inputError}
      name={name}
      type={'text'}
      validations={validations}
    >
      {({ canCheck, onBlur, error, dispatch }) => {
        const hasError = error && error !== null;
        const handleChange = e => {
          if (!canCheck) {
            dispatch({
              type: 'SET_CHECK',
            });
          }

          dispatch({
            type: 'SET_ERROR',
            error: null,
          });
          onChange(e);
        };

        const inputProps = {
          onBlur: onBlur,
          handleChange: handleChange,
          hasError: hasError,
        };

        return (
          <Wrapper>
            <Label htmlFor={name}>{label}</Label>
            {renderInput(inputProps, type)}
            {hasError && <ErrorMessage>{error}</ErrorMessage>}
          </Wrapper>
        );
      }}
    </Error>
  );
}

Inputs.defaultProps = {
  error: null,
  label: '',
  onClick: () => {},
  type: 'text',
  validations: {},
  value: null,
};

Inputs.propTypes = {
  error: PropTypes.string,
  label: PropTypes.oneOfType([PropTypes.string]),
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  type: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default Inputs;
