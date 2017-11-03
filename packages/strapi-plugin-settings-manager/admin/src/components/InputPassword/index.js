/**
*
* InputPassword
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, includes, mapKeys, reject, map, isObject, size } from 'lodash';
import { FormattedMessage } from 'react-intl';
import WithInput from 'components/WithInput';

/* eslint-disable react/require-default-props  */
class InputPassword extends React.Component { // eslint-disable-line react/prefer-stateless-function
  /* eslint-disable jsx-a11y/no-static-element-interactions */
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      hasInitialValue: false,
      type: true,
    };
  }

  componentDidMount() {
    if (this.props.value && !isEmpty(this.props.value)) {
      this.setState({ hasInitialValue: true });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!this.isSame(nextProps)) {
      this.setState({ errors: nextProps.errors });
    }
  }

  handleBlur = ({ target }) => {
    // prevent error display if input is initially empty
    if (!isEmpty(target.value) || this.state.hasInitialValue) {
      // validates basic string validations
      // add custom logic here such as alerts...
      const errors = this.validate(target.value);
      this.setState({ errors, hasInitialValue: true });
    }
  }

  isSame = (nextProps) => {
    return size(this.props.errors) === size(nextProps.errors) && this.props.errors.every((error, index) => error.id === nextProps.errors[index].id);
  }
  // Basic string validations
  validate = (value) => {
    let errors = [];
    // handle i18n
    const requiredError = { id: 'settings-manager.request.error.validation.required' };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'maxLength':
          if (value.length > validationValue) {
            errors.push({ id: 'settings-manager.request.error.validation.maxLength' });
          }
          break;
        case 'minLength':
          if (value.length < validationValue) {
            errors.push({ id: 'settings-manager.request.error.validation.minLength' });
          }
          break;
        case 'required':
          if (value.length === 0) {
            errors.push({ id: 'settings-manager.request.error.validation.required' });
          }
          break;
        case 'regex':
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: 'settings-manager.request.error.validation.regex' });
          }
          break;
        default:
          errors = [];
      }
    });

    if (includes(errors, requiredError)) {
      errors = reject(errors, (error) => error !== requiredError);
    }
    return errors;
  }

  handleShowPassword = () => this.setState({ type: !this.state.type })

  renderErrors = () => { // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      return (
        map(this.state.errors, (error, key) => {
          const displayError = isObject(error) && error.id
            ? <FormattedMessage id={error} />
            : error;
          return (
            <div key={key} className="form-control-feedback invalid-feedback" style={{ fontSize: '1.3rem' }}>{displayError}</div>
          );
        })
      );
    }
  }


  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'has-danger' : '';
    const placeholder = this.props.placeholder || this.props.name;

    const type = this.state.type ? 'password' : 'text';

    const color = this.state.type ? { color: '#9EA7B8' } : { color: 'black' };

    return (
      <div className={`${bootStrapClass}`}>
        <div className={`${this.props.styles.inputText} ${bootStrapClassDanger}`}>
          <label htmlFor={this.props.name}><FormattedMessage id={`settings-manager.${this.props.name}`} /></label>
          <FormattedMessage id={`settings-manager.${placeholder}`}>
            {(message) => (
              <input
                name={this.props.target}
                id={this.props.name}
                onBlur={handleBlur}
                onFocus={this.props.handleFocus}
                onChange={this.props.handleChange}
                value={inputValue}
                type={type}
                className={`form-control ${!isEmpty(this.state.errors) ? 'form-control-danger is-invalid' : ''}`}
                placeholder={message}
                autoComplete="off"
              />
            )}
          </FormattedMessage>
          <small>{this.props.inputDescription}</small>
          {this.renderErrors()}
        </div>
        <div className={this.props.styles.insideInput} onClick={this.handleShowPassword} style={color}>
          <i className="fa fa-eye" />
        </div>
      </div>
    );
  }
}

InputPassword.propTypes = {
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  errors: PropTypes.array,
  handleBlur: PropTypes.func,
  handleChange: PropTypes.func,
  handleFocus: PropTypes.func,
  inputDescription: PropTypes.string,
  name: PropTypes.string,
  noErrorsDescription: PropTypes.bool,
  placeholder: PropTypes.string,
  styles: PropTypes.object,
  target: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.string,
};

export default WithInput(InputPassword); // eslint-disable-line new-cap
