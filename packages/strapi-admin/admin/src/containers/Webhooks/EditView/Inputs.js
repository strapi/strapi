/**
 *
 * Inputs
 */

import React from 'react';
import PropTypes from 'prop-types';

import { ErrorMessage, Label } from '@buffetjs/styles';
import { Error, InputText } from '@buffetjs/core';

function Inputs({
  error: inputError,
  label,
  name,
  onChange,
  validations,
  value,
}) {
  return (
    <Error
      inputError={inputError}
      name={name}
      type="text"
      validations={validations}
    >
      {({ canCheck, onBlur, error, dispatch }) => {
        const hasError = error && error !== null;
        return (
          <>
            <Label htmlFor={name}>{label}</Label>
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

            {hasError && <ErrorMessage>{error}</ErrorMessage>}
          </>
        );
      }}
    </Error>
  );
}

Inputs.defaultProps = {
  error: null,
  label: '',
  validations: {},
  value: [],
};

Inputs.propTypes = {
  error: PropTypes.string,
  label: PropTypes.oneOfType([PropTypes.string]),
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default Inputs;
