import React from 'react';
import PropTypes from 'prop-types';
import { includes, isEmpty, isFunction, mapKeys, reject } from 'lodash';
import cn from 'classnames';

// Design
import Label from 'components/Label';
import InputDescription from 'components/InputDescription';
import InputErrors from 'components/InputErrors';
import InputNumber from 'components/InputNumber';

import styles from './styles.scss';

class InputNumberWithErrors extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { errors: [], hasInitialValue: false };

  componentDidMount() {
    const { value, errors } = this.props;

    // Prevent the input from displaying an error when the user enters and leaves without filling it
    if (value && !isEmpty(value)) {
      this.setState({ hasInitialValue: true });
    }

    // Display input error if it already has some
    if (!isEmpty(errors)) {
      this.setState({ errors });
    }
  }

  componentWillReceiveProps(nextProps) {
    // Check if errors have been updated during validations
    if (nextProps.didCheckErrors !== this.props.didCheckErrors) {
      // Remove from the state the errors that have already been set
      const errors = isEmpty(nextProps.errors) ? [] : nextProps.errors;
      this.setState({ errors });
    }
  }

  /**
   * Set the errors depending on the validations given to the input
   * @param  {Object} target
   */
  handleBlur = ({ target }) => {
    // Prevent from displaying error if the input is initially isEmpty
    if (!isEmpty(target.value) || this.state.hasInitialValue) {
      const errors = this.validate(target.value);
      this.setState({ errors, hasInitialValue: true });
    }
  }

  render() {
    const {
      autoFocus,
      deactivateErrorHighlight,
      disabled,
      errorsClassName,
      errorsStyle,
      inputClassName,
      inputDescriptionClassName,
      inputDescriptionStyle,
      inputStyle,
      labelClassName,
      labelStyle,
      name,
      onChange,
      onFocus,
      placeholder,
      style,
      tabIndex,
      value,
    } = this.props;
    const handleBlur = isFunction(this.props.onBlur) ? this.props.onBlur : this.handleBlur;

    return (
      <div className={cn(
          styles.container,
          this.props.customBootstrapClass,
          !isEmpty(this.props.className) && this.props.className,
        )}
        style={style}
      >
        <Label
          className={labelClassName}
          htmlFor={name}
          message={this.props.label && this.props.label.message || this.props.label}
          style={labelStyle}
        />
        <InputNumber
          autoFocus={autoFocus}
          className={inputClassName}
          disabled={disabled}
          deactivateErrorHighlight={deactivateErrorHighlight}
          error={!isEmpty(this.state.errors)}
          name={name}
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
          style={inputStyle}
          tabIndex={tabIndex}
          value={value}
        />
        <InputDescription
          className={inputDescriptionClassName}
          message={this.props.inputDescription && this.props.inputDescription.message || this.props.inputDescription}
          style={inputDescriptionStyle}
        />
        <InputErrors
          className={errorsClassName}
          errors={this.state.errors}
          style={errorsStyle}
        />
      </div>
    );
  }

  validate = (value) => {
    const requiredError = { id: 'components.Input.error.validation.required' };
    let errors = [];

    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'max': {
          if (parseInt(value, 10) > validationValue) {
            errors.push({ id: 'components.Input.error.validation.max' });
          }
          break;
        }
        case 'min': {
          if (parseInt(value, 10) < validationValue) {
            errors.push({ id: 'components.Input.error.validation.min' });
          }
          break;
        }
        case 'required': {
          if (value.length === 0) {
            console.log('ok');
            errors.push({ id: 'components.Input.error.validation.required' });
          }
          break;
        }
        case 'regex': {
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: 'components.Input.error.validation.regex' });
          }
          break;
        }
        default:
          errors = [];
      }
    });

    if (includes(errors, requiredError)) {
      errors = reject(errors, (error) => error !== requiredError);
    }

    return errors;
  }
}

InputNumberWithErrors.defaultProps = {
  autoFocus: false,
  className: '',
  customBootstrapClass: 'col-md-6',
  deactivateErrorHighlight: false,
  didCheckErrors: false,
  disabled: false,
  onBlur: false,
  onFocus: () => {},
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  inputClassName: '',
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  inputStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  placeholder: 'app.utils.placeholder.defaultMessage',
  style: {},
  tabIndex: '0',
  validations: {},
};

InputNumberWithErrors.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  errors: PropTypes.array,
  errorsClassName: PropTypes.string,
  errorsStyle: PropTypes.object,
  inputClassName: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      message: PropTypes.shape({
        id: PropTypes.string,
        params: PropTypes.object,
      }),
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
  inputDescriptionStyle: PropTypes.object,
  inputStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      message: PropTypes.shape({
        id: PropTypes.string,
        params: PropTypes.object,
      }),
    }),
  ]),
  labelClassName: PropTypes.string,
  labelStyle: PropTypes.object,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.string.isRequired,
};

export default InputNumberWithErrors;
