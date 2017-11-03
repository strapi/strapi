/**
*
* Input
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { get, isEmpty, map, mapKeys, isObject, reject, includes } from 'lodash';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

/* eslint-disable react/jsx-wrap-multilines */
/* eslint-disable react/require-default-props */
class Input extends React.Component { // eslint-disable-line react/prefer-stateless-function
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

    if (!isEmpty(this.props.errors)) {
      this.setState({ errors: this.props.errors });
    }
  }

  componentWillReceiveProps(nextProps) {
    // Check if errors have been updated during validations
    if (this.props.didCheckErrors !== nextProps.didCheckErrors) {

      // Remove from the state errors that are already set
      const errors = isEmpty(nextProps.errors) ? [] : nextProps.errors;
      this.setState({ errors });
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
    // handle i18n
    const requiredError = { id: `${this.props.pluginId}.error.validation.required` };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'max':
          if (parseInt(value, 10) > validationValue) {
            errors.push({ id: `${this.props.pluginId}.error.validation.max` });
          }
          break;
        case 'maxLength':
          if (value.length > validationValue) {
            errors.push({ id: `${this.props.pluginId}.error.validation.maxLength` });
          }
          break;
        case 'min':
          if (parseInt(value, 10) < validationValue) {
            errors.push({ id: `${this.props.pluginId}.error.validation.min` });
          }
          break;
        case 'minLength':
          if (value.length < validationValue) {
            errors.push({ id: `${this.props.pluginId}.error.validation.minLength` });
          }
          break;
        case 'required':
          if (value.length === 0) {
            errors.push({ id: `${this.props.pluginId}.error.validation.required` });
          }
          break;
        case 'regex':
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: `${this.props.pluginId}.error.validation.regex` });
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


  handleChangeCheckbox = () => {
    const target = {
      type: 'checkbox',
      value: !this.props.value,
      name: this.props.name,
    };

    this.props.onChange({ target });
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

  renderInputCheckbox = (requiredClass,  inputDescription) => {
    const title = !isEmpty(this.props.title) ? <div className={styles.inputTitle}><FormattedMessage id={this.props.title} /></div> : '';
    const spacer = !inputDescription ? <div /> : <div style={{ marginBottom: '.5rem'}}></div>;

    return (
      <div className={`${styles.inputCheckbox} col-md-12 ${requiredClass}`}>
        <div className="form-check">
          {title}
          <FormattedMessage id={this.props.label}>
            {(message) => (
              <label className={`${styles.checkboxLabel} form-check-label`} htmlFor={this.props.label} onClick={this.handleChangeCheckbox}  style={{ cursor: 'pointer' }}>
                <input className="form-check-input" type="checkbox" checked={this.props.value} onChange={this.handleChangeCheckbox} name={this.props.name} tabIndex={this.props.tabIndex} />
                {message}
              </label>
            )}
          </FormattedMessage>
          <div className={styles.inputCheckboxDescriptionContainer}>
            <small>{inputDescription}</small>
          </div>
        </div>
        {spacer}
      </div>
    );
  }

  renderInputSelect = (bootStrapClass, requiredClass, inputDescription, bootStrapClassDanger, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.input} ${requiredClass} ${bootStrapClass} ${bootStrapClassDanger}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} />
        </label>
        <select
          className="form-control"
          id={this.props.label}
          name={this.props.name}
          onChange={this.props.onChange}
          value={this.props.value}
          disabled={this.props.disabled}
          onBlur={handleBlur}
          tabIndex={this.props.tabIndex}
        >
          {map(this.props.selectOptions, (option, key) => (
            option.name ?
              <FormattedMessage id={option.name} defaultMessage={option.name} values={{ option: option.name }} key={key}>
                {(message) => (
                  <option value={option.value}>
                    {message}
                  </option>
                )}
              </FormattedMessage> :
              <option value={option.value} key={key}>{option.name}</option>
          ))}
        </select>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors()}
        {spacer}
      </div>
    );

  }

  renderInputTextArea = (bootStrapClass, requiredClass, bootStrapClassDanger, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.inputTextArea} ${bootStrapClass} ${requiredClass} ${bootStrapClassDanger}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} />
        </label>
        <FormattedMessage id={this.props.placeholder || this.props.label}>
          {(placeholder) => (
            <textarea
              className="form-control"
              onChange={this.props.onChange}
              value={this.props.value}
              name={this.props.name}
              id={this.props.label}
              onBlur={handleBlur}
              onFocus={this.props.onFocus}
              placeholder={placeholder}
              disabled={this.props.disabled}
              tabIndex={this.props.tabIndex}
            />
          )}
        </FormattedMessage>
        <div className={styles.inputTextAreaDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors(styles.errorContainerTextArea)}
        {spacer}
      </div>
    );
  }

  renderFormattedInput = (handleBlur, inputValue, placeholder) => (
    <FormattedMessage id={`${placeholder}`} defaultMessage='{placeholder}' values={{ placeholder }}>
      {(message) => (
        <input
          name={this.props.name}
          id={this.props.label}
          onBlur={handleBlur}
          onFocus={this.props.onFocus}
          onChange={this.props.onChange}
          value={inputValue}
          type={this.props.type}
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={message}
          autoComplete="off"
          disabled={this.props.disabled}
          tabIndex={this.props.tabIndex}
        />
      )}
    </FormattedMessage>
  )

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.onBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'has-danger' : '';
    const placeholder = this.props.placeholder || this.props.label;

    const label = this.props.label ?
      <label htmlFor={this.props.label}><FormattedMessage id={`${this.props.label}`} /></label>
      : <label htmlFor={this.props.label} />; // eslint-disable-line jsx-a11y/label-has-for

    const requiredClass = get(this.props.validations, 'required') && this.props.addRequiredInputDesign ?
      styles.requiredClass : '';


    const input = placeholder ? this.renderFormattedInput(handleBlur, inputValue, placeholder)
      : <input
        name={this.props.name}
        id={this.props.label}
        onBlur={handleBlur}
        onFocus={this.props.onFocus}
        onChange={this.props.onChange}
        value={inputValue}
        type={this.props.type}
        className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
        placeholder={placeholder}
        disabled={this.props.disabled}
        tabIndex={this.props.tabIndex}
      />;

    const link = !isEmpty(this.props.linkContent) ? <a href={this.props.linkContent.link} target="_blank"><FormattedMessage id={this.props.linkContent.description} /></a> : '';

    let inputDescription = !isEmpty(this.props.inputDescription) ? <FormattedMessage id={this.props.inputDescription} /> : '';

    if (!isEmpty(this.props.linkContent) && !isEmpty(this.props.inputDescription)) {
      inputDescription = <FormattedMessage id='input.description' defaultMessage={`{description}, {link}`} values={{link, description: <FormattedMessage id={this.props.inputDescription} /> }} />;
    }

    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    switch (this.props.type) {
      case 'select':
        return this.renderInputSelect(bootStrapClass, requiredClass, inputDescription, bootStrapClassDanger, handleBlur);
      case 'textarea':
        return this.renderInputTextArea(bootStrapClass, requiredClass, bootStrapClassDanger, inputDescription, handleBlur);
      case 'checkbox':
        return this.renderInputCheckbox(requiredClass, inputDescription);
      default:
    }

    const addonInput = this.props.addon ?
      <div className={`input-group ${styles.input}`} style={{ marginBottom: '1rem'}}>
        <span className={`input-group-addon ${styles.addon}`}><FormattedMessage id={this.props.addon} values={{ addon: this.props.addon }} defaultMessage='{addon}' /></span>
        {input}
      </div> : input;
    return (
      <div className={`${styles.input} ${bootStrapClass} ${requiredClass} ${bootStrapClassDanger}`}>
        {label}

        {addonInput}
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
  addon: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  addRequiredInputDesign: PropTypes.bool,
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  errors: PropTypes.array,
  inputDescription: PropTypes.string,
  label: PropTypes.string.isRequired,
  linkContent: PropTypes.shape({
    link: PropTypes.string,
    description: PropTypes.string.isRequired,
  }),
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onBlur: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.bool,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  pluginId: PropTypes.string,
  selectOptions: PropTypes.array,
  tabIndex: PropTypes.string,
  title: PropTypes.string,
  type: PropTypes.string.isRequired,
  validations: PropTypes.object.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.bool,
    PropTypes.number,
  ]),
};

export default Input;
