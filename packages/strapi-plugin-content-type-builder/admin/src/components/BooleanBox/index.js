import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@buffetjs/core';
import { useGlobalContext } from 'strapi-helper-plugin';
import Div from './Div';
import Enumeration from './Enumeration';
import EnumerationWrapper from './EnumerationWrapper';
import Wrapper from './Wrapper';

const BooleanBox = ({ label, name, onChange, options, value }) => {
  const { formatMessage } = useGlobalContext();

  return (
    <Div>
      <Label htmlFor={name}>{label}</Label>
      <Wrapper>
        {options.map(option => {
          return (
            <Enumeration
              key={option.value}
              id={option.value.toString()}
              className="option-input"
              checked={option.value === value}
              name={name}
              onChange={onChange}
              type="radio"
              value={option.value}
            />
          );
        })}
        {options.map(option => {
          return (
            <EnumerationWrapper
              className="option"
              key={option.value}
              htmlFor={option.value.toString()}
            >
              <span className="option__indicator" />
              <span className="option__title">
                {formatMessage({ id: option.headerId })}
              </span>
              <p>{formatMessage({ id: option.descriptionId })}</p>
            </EnumerationWrapper>
          );
        })}
      </Wrapper>
    </Div>
  );
};

BooleanBox.defaultProps = {
  label: '',
  options: [],
};

BooleanBox.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]).isRequired,
};

export default BooleanBox;
