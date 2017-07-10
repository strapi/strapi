/**
*
* InputNumber
*
*/

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

/*
* InputNumber
* A customizable input
* Settings :
* - deactivateErrorHighlight
* - noBootstrap // remove bootStrapClass
* - overrideBootstrapGrid
* - overrideBootstrapCol
* - handleBur : override default handleBlur function
*/



class InputNumber extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: false,
    };
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.errors !== nextProps.errors) {
      const errors = _.isEmpty(nextProps.errors) ? nextProps.errors === true ? [] : false : nextProps.errors;
      this.setState({ errors });
    }
  }

  handleBlur = ({ target }) => {
    const errors = this.validate(target.value);
    this.setState({ errors });
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
    const bootStrapClass = !this.props.noBootstrap ?
      `col-${this.props.overrideBootstrapGrid || 'md'}-${this.props.overrideBootstrapCol || '4'}`
      : '';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.noBootstrap && !this.props.deactivateErrorHighlight && this.state.errors ? 'has-danger' : '';
    // use bootstrap class to display error
    const formError = !this.props.noBootstrap ? 'form-control-feedback' : '';
    const placeholder = this.props.placeholder || `Change ${this.props.name} field`;
    return (
      <div className={`${styles.inputNumber} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label></label>
        <input
          type="number"
          value={this.state.value}
          onBlur={handleBlur}
          onChange={this.props.handleChange}
          className={`${this.props.noBootstrap? '' : 'form-control'} ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={placeholder}
        />
        <small>{this.props.inputDescription}</small>
        {_.map(this.state.errors, (error, key) => (
          <div key={key} className={formError}>{error}</div>
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
  inputDescription: React.PropTypes.string,
  name: React.PropTypes.string.isRequired,
  noBootstrap: React.PropTypes.bool,
  overrideBootstrapGrid: React.PropTypes.string,
  overrideBootstrapCol: React.PropTypes.string,
  placeholder: React.PropTypes.string,
  value: React.PropTypes.oneOfType([
    React.PropTypes.number.isRequired,
    React.PropTypes.string.isRequired,
  ]),
  validations: React.PropTypes.object.isRequired,
}

export default InputNumber;
