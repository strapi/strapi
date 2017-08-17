/**
*
* InputNumber
* Customization
*   - deactivateErrorHighlight: bool
*     allow the user to remove bootstrap class 'has-danger' on the inputText
*   - customBootstrapClass : string
*     overrides the default 'col-md-6' on the inputText
*   - handleBlur: function
*     overrides the default input validations
*   - errors : array
*     prevent from displaying errors messages
*
* Required
*  - name : string
*  - handleChange : function
*  - target : string
*  - value : string
*  - validations : object
*
* Optionnal
* - description : input description
* - handleFocus : function
* - placeholder : string if set to "" nothing will display
*
*
* - styles are retrieved from the HOC
*/

import React from 'react';
import { isEmpty, includes, map, mapKeys, isObject, reject } from 'lodash';
import { FormattedMessage } from 'react-intl';
import WithInput from 'components/WithInput';

class InputNumber extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      hasInitialValue: false,
    };
  }

  componentDidMount() {
    if (this.props.value && this.props.value !== '') {
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

  validate = (value) => {
    let errors = [];

    const requiredError = { id: 'request.error.validation.required' };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'required':
          if (value.length === 0) {
            errors.push({ id: 'request.error.validation.required' });
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
    <FormattedMessage id={`settings-manager.${placeholder}`}>
      {(message) => (
        <input
          name={this.props.target}
          id={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type="number"
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
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-4';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'has-danger' : '';
    const placeholder = this.props.placeholder || this.props.name;

    const input = placeholder ? this.renderFormattedInput(handleBlur, inputValue, placeholder)
      : <input
        type="number"
        name={this.props.target}
        id={this.props.name}
        value={inputValue}
        onBlur={handleBlur}
        onChange={this.props.handleChange}
        onFocus={this.props.handleFocus}
        className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
        placeholder={placeholder}
      />;

    const requiredClass = this.props.validations.required && this.props.addRequiredInputDesign ? this.props.styles.requiredClass : '';

    return (
      <div className={`${this.props.styles.inputNumber} ${requiredClass} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label htmlFor={this.props.name}><FormattedMessage id={`settings-manager.${this.props.name}`} /></label>
        {input}
        <small>{this.props.inputDescription}</small>
        {this.renderErrors()}
      </div>
    );
  }
}

InputNumber.propTypes = {
  addRequiredInputDesign: React.PropTypes.bool,
  customBootstrapClass: React.PropTypes.string,
  deactivateErrorHighlight: React.PropTypes.bool,
  errors: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.array,
  ]),
  handleBlur: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  handleFocus: React.PropTypes.func,
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  noErrorsDescription: React.PropTypes.bool,
  placeholder: React.PropTypes.string,
  styles: React.PropTypes.object,
  target: React.PropTypes.string.isRequired,
  validations: React.PropTypes.object.isRequired,
  value: React.PropTypes.oneOfType([
    React.PropTypes.number.isRequired,
    React.PropTypes.string.isRequired,
  ]),
}

export default WithInput(InputNumber); // eslint-disable-line new-cap
