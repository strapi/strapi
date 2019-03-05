/**
 *
 * InputJSONWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isFunction } from 'lodash';
import cn from 'classnames';

// Design
import Label from 'components/Label';
import InputDescription from 'components/InputDescription';
import InputErrors from 'components/InputErrors';
import InputSpacer from 'components/InputSpacer';

// Utils
import validateInput from 'utils/inputsValidations';

import InputJSON from '../InputJSON';

import styles from './styles.scss';

class InputJSONWithErrors extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { errors: [], hasInitialValue: false };

  componentDidMount() {
    const { value, errors } = this.props;

    // Prevent the input from displaying an error when the user enters and leaves without filling it
    if (!isEmpty(value)) {
      this.setState({ hasInitialValue: true });
    }

    // Display input error if it already has some
    if (!isEmpty(errors)) {
      this.setState({ errors });
    }
  }

  componentDidUpdate(prevProps) {
    // Show required error if the input's value is received after the compo is mounted
    if (!isEmpty(this.props.value) && !this.state.hasInitialValue) {
      this.setInit();
    }

    // Check if errors have been updated during validations
    if (prevProps.didCheckErrors !== this.props.didCheckErrors) {
      // Remove from the state the errors that have already been set
      const errors = isEmpty(this.props.errors) ? [] : this.props.errors;
      this.setErrors(errors);
    }
  }

  setErrors = errors => this.setState({ errors });

  setInit = () => this.setState({ hasInitialValue: true });

  /**
   * Set the errors depending on the validations given to the input
   * @param  {Object} target
   */
  handleBlur = ({ target }) => {
    // Prevent from displaying error if the input is initially isEmpty
    if (!isEmpty(target.value) || this.state.hasInitialValue) {
      const errors = validateInput(target.value, this.props.validations);
      this.setErrors(errors);
      this.setInit();
    }
  }

  handleChange = (e) => {
    this.setState({ errors: [] });
    this.props.onChange(e);
  }

  render() {
    const {
      autoFocus,
      className,
      customBootstrapClass,
      deactivateErrorHighlight,
      disabled,
      errorsClassName,
      errorsStyle,
      inputClassName,
      inputDescription,
      inputDescriptionClassName,
      inputStyle,
      label,
      labelClassName,
      labelStyle,
      name,
      noErrorsDescription,
      onBlur,
      placeholder,
      resetProps,
      style,
      tabIndex,
      value,
    } = this.props;
    const handleBlur = isFunction(onBlur) ? onBlur : this.handleBlur;

    let spacer = !isEmpty(inputDescription) ? <InputSpacer /> : <div />;

    if (!noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div
        className={cn(
          styles.containerJSON,
          customBootstrapClass,
          !isEmpty(className) && className,
        )}
        style={style}
      >
        <Label
          className={labelClassName}
          htmlFor={name}
          message={label}
          style={labelStyle}
        />
        <InputJSON
          autoFocus={autoFocus}
          className={inputClassName}
          disabled={disabled}
          deactivateErrorHighlight={deactivateErrorHighlight}
          name={name}
          onBlur={handleBlur}
          onChange={this.handleChange}
          placeholder={placeholder}
          resetProps={resetProps}
          style={inputStyle}
          tabIndex={tabIndex}
          value={value}
        />
        <InputDescription
          className={inputDescriptionClassName}
          message={inputDescription}
          style={{ marginTop: '3.2rem'}}
        />
        <InputErrors
          className={errorsClassName}
          errors={!noErrorsDescription && this.state.errors || []}
          name={name}
          style={errorsStyle}
        />
        {spacer}
      </div>
    );
  }
}

InputJSONWithErrors.defaultProps = {
  autoFocus: false,
  className: '',
  customBootstrapClass: 'col-md-12',
  deactivateErrorHighlight: false,
  didCheckErrors: false,
  disabled: false,
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  inputClassName: '',
  inputDescription: '',
  inputDescriptionClassName: '',
  inputStyle: {},
  label: '',
  labelClassName: '',
  labelStyle: {},
  noErrorsDescription: false,
  onBlur: false,
  placeholder: '',
  resetProps: false,
  style: {},
  tabIndex: '0',
  validations: {},
  value: null,
};

InputJSONWithErrors.propTypes = {
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
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
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
  labelStyle: PropTypes.object,
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  resetProps: PropTypes.bool,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.object,
};

export default InputJSONWithErrors;
