/**
*
* InputText
* Customization
*   - deactivateErrorHighlight: bool
*     allow the user to remove bootstrap class 'has-danger' on the inputText
*   - customBootstrapClass : string
*     overrides the default 'col-md-6' on the inputText
*   - handleBlur: function
*     overrides the default input validations
*   - errors : array
*     custom errors if set to false it deactivate error display
*
* Required
*  - name : string
*  - handleChange : function
*  - value : string
*  - validations : object
*
* Optionnal
* - description : input description
* - handleFocus : function
* - placeholder : string if set to "" nothing will display
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';


class InputText extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: false,
      hasInitialValue: false,
    };
  }

  componentDidMount() {
    if (this.props.value.length > 0) {
      this.setState({ hasInitialValue: true });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.errors !== nextProps.errors) {
      const errors = _.isEmpty(nextProps.errors) ? nextProps.errors === true ? [] : false : nextProps.errors;
      this.setState({ errors });
    }
  }

  handleBlur = ({ target }) => {
    // prevent error display if input is initially empty
    if (target.value.length > 0 || this.state.hasInitialValue) {
      // validates basic string validations
      // add custom logic here such as alerts...
      const errors = this.validate(target.value);
      this.setState({ errors });
    }
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
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && this.state.errors ? 'has-danger' : '';
    const placeholder = this.props.placeholder || `Change ${this.props.name} field`;
    return (
      <div className={`${styles.inputText} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label>{this.props.name}</label>
        <input
          name={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type="text"
          className={`${this.props.noBootstrap? '' : 'form-control'} ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={placeholder}
        />
        <small>{this.props.inputDescription}</small>
        {_.map(this.state.errors, (error, key) => (
          <div key={key} className="form-control-feedback">{error}</div>
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
  handleBlur: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  handleFocus: React.PropTypes.func,
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  customBootstrapClass: React.PropTypes.string,
  placeholder: React.PropTypes.string,
  value: React.PropTypes.string.isRequired,
  validations: React.PropTypes.object.isRequired,
}

export default InputText;
