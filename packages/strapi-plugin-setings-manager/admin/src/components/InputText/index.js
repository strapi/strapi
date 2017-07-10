/**
*
* InputText
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

/*
* InpuText
* A customizable input
* Settings :
* - deactivateErrorHighlight
* - noBootstrap // remove bootStrapClass
* - overrideBootstrapGrid
* - overrideBootstrapCol
*/



class InputText extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.errors !== nextProps.errors) {
      const errors = _.isEmpty(nextProps.errors) ? nextProps.errors ? [] : false : nextProps.errors;
      this.setState({ errors });
    }
  }

  handleBlur = ({ target }) => {
    // validates basic string validations
    // add custom logic here such as alerts...
    const errors = this.validate(target.value);
    this.setState({ errors });
  }

  // Basic string validations
  validate = (value) => {
      let errors = [];
      const requiredError = 'Field is required';
    _.mapKeys(this.props.validations, (validationValue, validationKey) => {
        switch (validationKey) {
          case 'maxLength':
            if (value.length > validationValue) {
              errors.push('Field is too long');
            }
            break;
          case 'minLength':
            if (value.length < validationValue) {
              errors.push('Field is too short');
            }
            break;
          case 'required':
            if (value.length === 0) {
              errors.push(requiredError);
            }
            break;
          case 'regex':
            if (!validationValue.test(value)) {
              errors.push('Field is not valid');
            }
            break;
          default:
          errors = false;
        }
    });
    if (_.isEmpty(errors)) {
      errors = false;
    } else if (_.includes(errors, requiredError)) {
      errors = _.reject(errors, (value) => value !== requiredError);
    }
    return errors;
  }

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = !this.props.noBootstrap ?
      `col-${this.props.overrideBootstrapGrid || 'md'}-${this.props.overrideBootstrapCol || '6'}`
      : '';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.noBootstrap && !this.props.deactivateErrorHighlight && this.state.errors ? 'has-danger' : '';
    // use bootstrap class to display error
    const formError = !this.props.noBootstrap ? 'form-control-feedback' : '';
    return (
      <div className={`${styles.inputText} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label>{this.props.name}</label>
        <input
          name={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.onFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type="text"
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={`Change ${this.props.name} field`}
        />
        <small>{this.props.inputDescription}</small>
        {_.map(this.state.errors, (error, key) => (
          <div key={key} className={formError}>{error}</div>
        ))}
      </div>
    );
  }
}

InputText.propTypes = {
  errors: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.array,
  ]),
  deactivateErrorHighlight: React.PropTypes.bool,
  handleBur: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  noBootstrap: React.PropTypes.bool,
  overrideBootstrapGrid: React.PropTypes.string,
  overrideBootstrapCol: React.PropTypes.string,
  placeholder: React.PropTypes.string,
  value: React.PropTypes.string.isRequired,
  validations: React.PropTypes.object.isRequired,
}

export default InputText;
