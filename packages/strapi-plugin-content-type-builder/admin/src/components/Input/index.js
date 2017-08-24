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


  componentDidMount() {
    // Init the select value if type === "select"
    if (this.props.type === 'select' && !isEmpty(this.props.selectOptions) && this.props.selectOptions[0].value !== '') {
      const target = { name: this.props.target, value: this.props.selectOptions[0].value  };
      this.props.handleChange({ target });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.type === 'select' && this.props.selectOptionsFetchSucceeded !== nextProps.selectOptionsFetchSucceeded && nextProps.selectOptions[0].value !== '') {
      const target = { name: nextProps.target, value: nextProps.selectOptions[0].value  };
      this.props.handleChange({ target });
    }
  }

  renderErrors = (errorStyles) => { // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      const divStyle = errorStyles || styles.errorContainer;
      return (
        map(this.state.errors, (error, key) => {
          const displayError = isObject(error) && error.id
            ? <FormattedMessage {...error} />
            : error;
          return (
            <div key={key} className={`form-control-feedback ${divStyle}`}>{displayError}</div>
          );
        })
      );
    }
  }

  renderInputSelect = (bootStrapClass, requiredClass, inputDescription) => {
    const spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;
    return (
      <div className={`${styles.input} ${requiredClass} ${bootStrapClass}`}>
        <label htmlFor={this.props.name}>
          <FormattedMessage id={`${this.props.name}`} />
        </label>
        <select
          className="form-control"
          id={this.props.name}
          name={this.props.target}
          onChange={this.props.handleChange}
          value={this.props.value}
        >
          {map(this.props.selectOptions, (option, key) => (
            <FormattedMessage id={`${option.name}`} key={key}>
              {(message) => (
                <option value={option.value}>
                  {message}
                </option>
              )}
            </FormattedMessage>
          ))}
        </select>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {spacer}
      </div>
    );

  }

  renderInputTextArea = (bootStrapClass, requiredClass, bootStrapClassDanger, inputDescription) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.inputTextArea} ${bootStrapClass} ${requiredClass} ${bootStrapClassDanger}`}>
        <label htmlFor={this.props.name}>
          <FormattedMessage id={`${this.props.name}`} />
        </label>
        <FormattedMessage id={this.props.placeholder || this.props.name}>
          {(placeholder) => (
            <textarea
              className="form-control"
              onChange={this.props.handleChange}
              value={this.props.value}
              name={this.props.target}
              id={this.props.name}

              placeholder={placeholder}
            />
          )}
        </FormattedMessage>
        <div className={styles.inputTextAreaDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors(styles.errorContainerTextArea)}
        {spacer}
      </div>
    )
  }

  renderFormattedInput = (handleBlur, inputValue, placeholder) => (
    <FormattedMessage id={`${placeholder}`}>
      {(message) => (
        <input
          name={this.props.target}
          id={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type={this.props.type}
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
      styles.requiredClass : '';

    const input = placeholder ? this.renderFormattedInput(handleBlur, inputValue, placeholder)
      : <input
        name={this.props.target}
        id={this.props.name}
        onBlur={handleBlur}
        onFocus={this.props.handleFocus}
        onChange={this.props.handleChange}
        value={inputValue}
        type={this.props.type}
        className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
        placeholder={placeholder}
      />;

    const inputDescription = !isEmpty(this.props.inputDescription) ? <FormattedMessage id={this.props.inputDescription} /> : '';

    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    if (this.props.type === 'select') {
      return this.renderInputSelect(bootStrapClass, requiredClass, inputDescription);
    }

    if (this.props.type === 'textarea') {
      return this.renderInputTextArea(bootStrapClass, requiredClass, bootStrapClassDanger, inputDescription);
    }

    return (
      <div className={`${styles.input} ${bootStrapClass} ${requiredClass} ${bootStrapClassDanger}`}>
        {label}
        {input}
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
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
  // styles: React.PropTypes.object,
  selectOptions: React.PropTypes.array,
  selectOptionsFetchSucceeded: React.PropTypes.bool,
  target: React.PropTypes.string,
  type: React.PropTypes.string.isRequired,
  validations: React.PropTypes.object.isRequired,
  value: React.PropTypes.string,
};

export default Input;
