/**
 *
 * Inputs
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { ErrorMessage, Label } from '@buffetjs/styles';
import { Error } from '@buffetjs/core';
import HeadersInput from '../HeadersInput';
import EventInput from '../EventInput';
import Wrapper from './Wrapper';

function Inputs({
  error: inputError,
  customError,
  label,
  name,
  onChange,
  onClick,
  onRemove,
  type,
  validations,
  value,
}) {
  return (
    <Wrapper>
      <Label htmlFor={name}>{label}</Label>
      {type === 'headers' ? (
        <>
          <HeadersInput
            errors={customError}
            name={name}
            onClick={onClick}
            onChange={onChange}
            onRemove={onRemove}
            value={value}
          />
          {Object.keys(customError).length > 0 && (
            <ErrorMessage>
              <FormattedMessage id="components.Input.error.validation.required" />
            </ErrorMessage>
          )}
        </>
      ) : (
        <Error inputError={inputError} name={name} type="text" validations={validations}>
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
              <>
                <EventInput
                  name={name}
                  onChange={e => {
                    handleChange(e);
                  }}
                  value={value}
                />
                {hasError && <ErrorMessage>{error}</ErrorMessage>}
              </>
            );
          }}
        </Error>
      )}
    </Wrapper>
  );
}

Inputs.defaultProps = {
  error: null,
  customError: {},
  label: '',
  onClick: () => {},
  onRemove: () => {},
  type: 'text',
  validations: {},
  value: null,
};

Inputs.propTypes = {
  error: PropTypes.string,
  customError: PropTypes.object,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  type: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

export default Inputs;
