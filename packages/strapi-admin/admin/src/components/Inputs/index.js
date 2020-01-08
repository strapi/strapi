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
import EventInput from '../EventInput';

function Inputs({
  error: inputError,
  label,
  name,
  onChange,
  onBlur: handleBlur,
  onClick,
  onRemove,
  type,
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
      {({ canCheck, error, dispatch }) => {
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

        return (
          <Wrapper>
            <Label htmlFor={name}>{label}</Label>

            {type === 'headers' ? (
              <HeadersInput
                value={value}
                name={name}
                onClick={onClick}
                onChange={handleChange}
                onRemove={onRemove}
              />
            ) : type === 'events' ? (
              <EventInput
                value={value}
                name={name}
                onChange={e => {
                  handleChange(e);
                  handleBlur(e);
                }}
              />
            ) : (
              <InputText
                error={hasError}
                onBlur={handleBlur}
                onChange={handleChange}
                value={value}
                name={name}
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
  onBlur: () => {},
  onClick: () => {},
  onRemove: () => {},
  type: 'text',
  validations: {},
  value: null,
};

Inputs.propTypes = {
  error: PropTypes.string,
  label: PropTypes.oneOfType([PropTypes.string]),
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  type: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default Inputs;
