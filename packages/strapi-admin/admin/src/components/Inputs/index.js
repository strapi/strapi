/**
 *
 * Inputs
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { ErrorMessage, Label } from '@buffetjs/styles';
import { Error, InputText } from '@buffetjs/core';

import HeadersInput from '../HeadersInput';
import EventInput from '../EventInput';
import Wrapper from './Wrapper';

function Inputs({
  error: inputError,
  label,
  name,
  onChange,
  onBlur,
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
            errors={inputError}
            name={name}
            onBlur={onBlur}
            onClick={onClick}
            onChange={onChange}
            onRemove={onRemove}
            value={value}
          />
          {inputError && (
            <ErrorMessage>
              <FormattedMessage id="components.Input.error.validation.required" />
            </ErrorMessage>
          )}
        </>
      ) : (
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
              <>
                {type === 'events' ? (
                  <EventInput
                    name={name}
                    onChange={e => {
                      handleChange(e);
                      onBlur(e);
                    }}
                    value={value}
                  />
                ) : (
                  <InputText
                    className={hasError ? 'hasError' : ''}
                    name={name}
                    onBlur={onBlur}
                    onChange={handleChange}
                    value={value}
                  />
                )}
                {hasError && (
                  <ErrorMessage>
                    <FormattedMessage id={error} />
                  </ErrorMessage>
                )}
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
  label: '',
  onClick: () => {},
  onRemove: () => {},
  type: 'text',
  validations: {},
  value: null,
};

Inputs.propTypes = {
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  type: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

export default Inputs;
