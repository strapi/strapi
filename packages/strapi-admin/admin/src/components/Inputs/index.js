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
  return (
    <Error
      inputError={inputError}
      name={name}
      type={'text'}
      validations={validations}
    >
      {({ canCheck, onBlur, error, dispatch }) => {
        const hasError = error && error !== null;
        return (
          <Wrapper>
            <Label htmlFor={name}>{label}</Label>

            {type === 'text' ? (
              <InputText
                error={hasError}
                onBlur={onBlur}
                onChange={e => {
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
                }}
                value={value}
                name={name}
              />
            ) : (
              <HeadersInput
                value={value}
                name={name}
                onClick={onClick}
                onChange={e => {
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
                }}
              />
            )}

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
  value: '',
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
