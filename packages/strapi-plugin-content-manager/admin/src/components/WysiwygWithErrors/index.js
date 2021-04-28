/**
 *
 * WysiwygWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isFunction } from 'lodash';
import cn from 'classnames';
import { Description, ErrorMessage, Label } from '@buffetjs/styles';
import { Error } from '@buffetjs/core';
import { LabelIconWrapper } from 'strapi-helper-plugin';
import Wysiwyg from '../Wysiwyg';
import Wrapper from './Wrapper';

// eslint-disable-next-line react/prefer-stateless-function
class WysiwygWithErrors extends React.Component {
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
      onBlur: handleBlur,
      onChange,
      placeholder,
      resetProps,
      style,
      tabIndex,
      validations,
      value,
      ...rest
    } = this.props;

    return (
      <Error inputError={inputError} name={name} type="text" validations={validations}>
        {({ canCheck, onBlur, error, dispatch }) => {
          const hasError = Boolean(error);

          return (
            <Wrapper
              className={`${cn(!isEmpty(className) && className)} ${hasError ? 'bordered' : ''}`}
              style={style}
            >
              <Label htmlFor={name}>
                <span>{label}</span>
                {labelIcon && (
                  <LabelIconWrapper title={labelIcon.title}>{labelIcon.icon}</LabelIconWrapper>
                )}
              </Label>
              <Wysiwyg
                {...rest}
                autoFocus={autoFocus}
                className={inputClassName}
                disabled={disabled}
                deactivateErrorHighlight={deactivateErrorHighlight}
                error={hasError}
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
                  onChange(e);
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

WysiwygWithErrors.defaultProps = {
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
  labelIcon: null,
  onBlur: false,
  placeholder: '',
  resetProps: false,
  style: {},
  tabIndex: '0',
  validations: {},
  value: null,
};

WysiwygWithErrors.propTypes = {
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
  labelIcon: PropTypes.shape({
    icon: PropTypes.node.isRequired,
    title: PropTypes.string,
  }),
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  resetProps: PropTypes.bool,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.string,
};

export default WysiwygWithErrors;
