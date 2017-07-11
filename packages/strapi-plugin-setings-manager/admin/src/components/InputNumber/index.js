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
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

class InputNumber extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: false,
      hasInitialValue: false,
    };
  }

  componentDidMount() {
    if (this.props.value && this.props.value.length !== '') {
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

  validate = (value) => {
    const errors = !_.isEmpty(_.pick(this.props.validations, 'required')) && value.length > 0 ?
      false : ['This field is required'];
    return errors;
  }

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-4';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && this.state.errors ? 'has-danger' : '';
    const placeholder = this.props.placeholder || `Change ${this.props.name} field`;
    return (
      <div className={`${styles.inputNumber} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label>{this.props.name}</label>
        <input
          type="number"
          value={inputValue}
          onBlur={handleBlur}
          onChange={this.props.handleChange}
          onFocus={this.props.handleFocus}
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
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

InputNumber.propTypes = {
  errors: React.PropTypes.oneOfType([
    React.PropTypes.bool,
    React.PropTypes.array,
  ]),
  deactivateErrorHighlight: React.PropTypes.bool,
  handleBur: React.PropTypes.func,
  handleChange: React.PropTypes.func.isRequired,
  handleFocus: React.PropTypes.func,
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  customBootstrapClass: React.PropTypes.string,
  placeholder: React.PropTypes.string,
  value: React.PropTypes.oneOfType([
    React.PropTypes.number.isRequired,
    React.PropTypes.string.isRequired,
  ]),
  validations: React.PropTypes.object.isRequired,
}

export default InputNumber;
