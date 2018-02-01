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
    const { autoFocus, errorsClassName, errorsStyle, inputClassName, inputStyle, name, onChange, onFocus, placeholder, value } = this.props;
    const handleBlur = isFunction(this.props.onBlur) ? this.props.onBlur : this.handleBlur;
    
    return (
      <div className={cn(
          styles.container,
          this.props.customBootstrapClass || 'col-md-6',
          this.props.className,
        )}
      >
        <Label htmlFor={name} message={this.props.label && this.props.label.message || this.props.label} />
        <InputNumber
          autoFocus={autoFocus}
          className={inputClassName}
          errors={this.state.errors}
          name={name}
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
          style={inputStyle}
          value={value}
        />
        <InputDescription message={this.props.inputDescription && this.props.inputDescription.message || this.props.inputDescription} />
        <InputErrors className={errorsClassName} style={errorsStyle} errors={this.state.errors} />
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
  customBootstrapClass: false,
  didCheckErrors: false,
  onBlur: false,
  onFocus: () => {},
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  inputClassName: '',
  inputStyle: {},
  placeholder: 'app.utils.placeholder.defaultMessage',
  validations: {},
};

InputNumberWithErrors.propTypes = {
  customBootstrapClass: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  didCheckErrors: PropTypes.bool,
  errors: PropTypes.array,
  errorsClassName: PropTypes.string,
  errorsStyle: PropTypes.object,
  inputClassName: PropTypes.string,
  inputStyle: PropTypes.object,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
  ]),
};

export default InputNumberWithErrors;
