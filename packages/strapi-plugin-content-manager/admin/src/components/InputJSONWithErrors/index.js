/**
 *
 * InputJSONWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isFunction } from 'lodash';
import cn from 'classnames';
import { LabelIconWrapper } from 'strapi-helper-plugin';
import { Description, ErrorMessage, Label } from '@buffetjs/styles';
import { Error } from '@buffetjs/core';

import InputJSON from '../InputJSON';
import Wrapper from './Wrapper';

class InputJSONWithErrors extends React.Component {
  handleChange = e => {
    this.props.onChange(e);
  };

  render() {
    const {
      autoFocus,
      className,
      deactivateErrorHighlight,
      disabled,
      error: inputError,
      inputClassName,
      inputDescription,
      inputStyle,
      label,
      labelIcon,
      name,
      onBlur,
      placeholder,
      resetProps,
      tabIndex,
      validations,
      value,
      ...rest
    } = this.props;

    const handleBlur = isFunction(onBlur) ? onBlur : this.handleBlur;

    return (
      <Error inputError={inputError} name={name} type="text" validations={validations}>
        {({ canCheck, onBlur, error, dispatch }) => {
          const hasError = Boolean(error);

          return (
            <Wrapper
              className={`${cn(!isEmpty(className) && className)} ${hasError ? 'bordered' : ''}`}
            >
              <Label htmlFor={name}>
                <span>{label}</span>
                {labelIcon && (
                  <LabelIconWrapper title={labelIcon.title}>{labelIcon.icon}</LabelIconWrapper>
                )}
              </Label>
              <InputJSON
                {...rest}
                autoFocus={autoFocus}
                className={inputClassName}
                disabled={disabled}
                deactivateErrorHighlight={deactivateErrorHighlight}
                name={name}
                onBlur={isFunction(handleBlur) ? handleBlur : onBlur}
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
                  this.handleChange(e);
                }}
                placeholder={placeholder}
                resetProps={resetProps}
                style={inputStyle}
                tabIndex={tabIndex}
                value={value}
              />
              {!hasError && inputDescription && <Description>{inputDescription}</Description>}
              {hasError && <ErrorMessage>{error}</ErrorMessage>}
            </Wrapper>
          );
        }}
      </Error>
    );
  }
}

InputJSONWithErrors.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  didCheckErrors: false,
  disabled: false,
  error: null,
  inputClassName: '',
  inputDescription: '',
  inputStyle: {},
  label: '',
  labelClassName: '',
  labelIcon: null,
  labelStyle: {},
  onBlur: false,
  placeholder: '',
  resetProps: false,
  tabIndex: '0',
  validations: {},
  value: null,
};

InputJSONWithErrors.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  inputClassName: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  inputStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  labelClassName: PropTypes.string,
  labelIcon: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    title: PropTypes.string.isRequired,
  }),
  labelStyle: PropTypes.object,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  resetProps: PropTypes.bool,
  tabIndex: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
    PropTypes.bool,
    PropTypes.string,
    PropTypes.number,
  ]),
};

export default InputJSONWithErrors;
