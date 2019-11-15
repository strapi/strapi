/**
 *
 * InputFileWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { differenceBy, isEmpty } from 'lodash';
import { Description, ErrorMessage, Label } from '@buffetjs/styles';
import { Error } from '@buffetjs/core';
import { InputFile } from 'strapi-helper-plugin';

import Container from './Container';

class InputFileWithErrors extends React.PureComponent {
  state = { label: null, hasValue: false };

  componentDidMount() {
    let newState = Object.assign({}, this.state);

    if (this.props.multiple && !isEmpty(this.props.value)) {
      newState = Object.assign({}, newState, { label: 1, hasValue: true });
    }

    this.setState(newState);
  }

  componentDidUpdate(prevProps) {
    if (
      !this.state.hasValue &&
      !isEmpty(this.props.value) &&
      this.props.multiple &&
      differenceBy(this.props.value, prevProps.value, 'name').length > 0
    ) {
      this.updateState({ label: 1, hasValue: true });
    } else if (isEmpty(this.props.value)) {
      this.updateState({ label: null });
    }
  }

  setLabel = label => {
    this.setState({ label });
  };

  updateState = state => {
    this.setState(state);
  };

  render() {
    const {
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
    } = this.props;

    return (
      <Error
        inputError={inputError}
        name={name}
        type="text"
        validations={validations}
      >
        {({ canCheck, onBlur, error, dispatch }) => {
          const hasError = error && error !== null;

          if (!hasError && !canCheck) {
            dispatch({
              type: 'SET_CHECK',
            });
          }

          return (
            <Container className={className !== '' && className} style={style}>
              <Label htmlFor={`${name}NotNeeded`}>{label}</Label>
              {this.state.label && (
                <span className="labelNumber">
                  &nbsp;({this.state.label}/{value.length})
                </span>
              )}
              <InputFile
                multiple={multiple}
                error={hasError}
                name={name}
                onChange={e => {
                  dispatch({
                    type: 'SET_ERROR',
                    error: null,
                  });
                  onChange(e);
                  onBlur(e);
                }}
                setLabel={this.setLabel}
                value={value}
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
}

InputFileWithErrors.defaultProps = {
  error: null,
  className: '',
  didCheckErrors: false,
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  multiple: false,
  noErrorsDescription: false,
  style: {},
  validations: {},
  value: [],
};

InputFileWithErrors.propTypes = {
  className: PropTypes.string,
  didCheckErrors: PropTypes.bool,
  error: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
  inputDescriptionStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  labelClassName: PropTypes.string,
  labelStyle: PropTypes.object,
  multiple: PropTypes.bool,
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.array,
  ]),
};

export default InputFileWithErrors;
