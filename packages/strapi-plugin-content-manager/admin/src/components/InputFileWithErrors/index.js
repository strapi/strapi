/**
 *
 * InputFileWithErrors
 */

import React, { memo, useEffect, useState } from 'react';
import { isArray } from 'lodash';
import PropTypes from 'prop-types';

import { Description, ErrorMessage, Label } from '@buffetjs/styles';
import { Error } from '@buffetjs/core';
import InputFile from './InputFile';
import Container from './Container';

function InputFileWithErrors({
  className,
  error: inputError,
  inputDescription,
  label,
  multiple,
  name,
  onChange,
  style,
  validations,
  value,
}) {
  const [fileLabel, setFilelabel] = useState(null);

  useEffect(() => {
    if (isArray(value) && value.length > 0) {
      setFilelabel(1);
    }
  }, [value]);

  const setLabel = label => {
    setFilelabel(label);
  };

  return (
    <Error
      inputError={inputError}
      name={name}
      type="text"
      validations={validations}
    >
      {props => {
        const { error } = props;
        const hasError = error && error !== null;

        return (
          <Container className={className !== '' && className} style={style}>
            <Label htmlFor={`${name}NotNeeded`}>
              {label}
              {multiple && fileLabel && (
                <span className="labelNumber">
                  &nbsp;({fileLabel}/{value.length})
                </span>
              )}
            </Label>

            <InputFile
              {...props}
              error={hasError}
              onChange={onChange}
              value={value}
              setLabel={setLabel}
              name={name}
              multiple={multiple}
            />

            {!hasError && inputDescription && (
              <Description>{inputDescription}</Description>
            )}
            {hasError && <ErrorMessage>{error}</ErrorMessage>}
          </Container>
        );
      }}
    </Error>
  );
}

InputFileWithErrors.defaultProps = {
  className: '',
  error: null,
  inputDescription: '',
  label: '',
  multiple: false,
  style: {},
  validations: {},
  value: [],
};

InputFileWithErrors.propTypes = {
  className: PropTypes.string,
  error: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default memo(InputFileWithErrors);
