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
*   - noErrorsDescription : bool
*     prevent from displaying errors messages
*
* Required
*  - name : string
*  - handleChange : function
*  - value : string
*  - target : string
*  - validations : object
*
* Optionnal
* - description : input description
* - handleFocus : function
* - placeholder : string if set to "" nothing will display
*
* - styles are retrieved from the HOC
*/

import React from 'react';
import { isEmpty, includes, mapKeys, reject, map, isObject } from 'lodash';
import { FormattedMessage } from 'react-intl';
import WithInput from 'components/WithInput';

class InputText extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      hasInitialValue: false,
    };
  }

  componentDidMount() {
    if (this.props.value && !isEmpty(this.props.value)) {
      this.setState({ hasInitialValue: true });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.errors !== nextProps.errors) {
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

  // Basic string validations
  validate = (value) => {
    let errors = [];
    // handle i18n
    const requiredError = { id: 'request.error.validation.required' };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'maxLength':
          if (value.length > validationValue) {
            errors.push({ id: 'request.error.validation.maxLength' });
          }
          break;
        case 'minLength':
          if (value.length < validationValue) {
            errors.push({ id: 'request.error.validation.minLength' });
          }
          break;
        case 'required':
          if (value.length === 0) {
            errors.push({ id: 'request.error.validation.required' });
          }
          break;
        case 'regex':
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: 'request.error.validation.regex' });
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

  renderErrors = () => { // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      return (
        map(this.state.errors, (error, key) => {
          const displayError = isObject(error) && error.id ?
            <FormattedMessage {...error} /> : error;
          return (
            <div key={key} className="form-control-feedback">{displayError}</div>
          );
        })
      );
    }
  }

  renderFormattedInput = (handleBlur, inputValue, placeholder) => (
    <FormattedMessage {...{id: placeholder}}>
      {(message) => (
        <input
          name={this.props.target}
          id={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type="text"
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={message}
        />
      )}
    </FormattedMessage>
  )

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'has-danger' : '';
    const placeholder = this.props.placeholder || this.props.name;

    const label = this.props.name ? <label htmlFor={this.props.name}><FormattedMessage {...{id: this.props.name}} /></label> : '';

    const input = placeholder ? this.renderFormattedInput(handleBlur, inputValue, placeholder)
      : <input
        name={this.props.target}
        id={this.props.name}
        onBlur={handleBlur}
        onFocus={this.props.handleFocus}
        onChange={this.props.handleChange}
        value={inputValue}
        type="text"
        className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
        placeholder={placeholder}
      />;

    return (
      <div className={`${this.props.styles.inputText} ${bootStrapClass} ${bootStrapClassDanger}`}>
        {label}
        {input}
        <small>{this.props.inputDescription}</small>
        {this.renderErrors()}
      </div>
    );
  }
}

InputText.propTypes = {
  customBootstrapClass: React.PropTypes.string,
  deactivateErrorHighlight: React.PropTypes.bool,
  errors: React.PropTypes.array,
  handleBlur: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  handleFocus: React.PropTypes.func,
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  noErrorsDescription: React.PropTypes.bool,
  placeholder: React.PropTypes.string,
  styles: React.PropTypes.object,
  target: React.PropTypes.string,
  validations: React.PropTypes.object.isRequired,
  value: React.PropTypes.string,
}

export default WithInput(InputText); // eslint-disable-line new-cap
