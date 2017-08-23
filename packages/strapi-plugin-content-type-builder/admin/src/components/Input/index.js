/**
*
* Input
*
*/

import React from 'react';
import { isEmpty, map, isObject } from 'lodash';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class Input extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.state = {
      errors: [],
      hasInitialValue: false,
    };
  }


  renderErrors = () => { // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      return (
        map(this.state.errors, (error, key) => {
          const displayError = isObject(error) && error.id
            ? <FormattedMessage {...error} />
            : error;
          return (
            <div key={key} className={`form-control-feedback ${styles.errorContainer}`}>{displayError}</div>
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
          type="text"
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={message}
          autoComplete="off"
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

    const label = this.props.name ?
      <label htmlFor={this.props.name}><FormattedMessage id={`${this.props.name}`} /></label>
        : <label htmlFor={this.props.name} />;

    const requiredClass = this.props.validations.required && this.props.addRequiredInputDesign ?
      this.props.styles.requiredClass : '';

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


    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.input} ${bootStrapClass} ${requiredClass} ${bootStrapClassDanger}`}>
        {label}
        {input}
        <div className={styles.inputDescriptionContainer}>
          <small>{this.props.inputDescription}</small>
        </div>
        {this.renderErrors()}
        {spacer}
      </div>
    );
  }
}

Input.propTypes = {
  addRequiredInputDesign: React.PropTypes.bool,
  customBootstrapClass: React.PropTypes.string,
  deactivateErrorHighlight: React.PropTypes.bool,
  // errors: React.PropTypes.array,
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
};

export default Input;
