/**
*
* Input
*
*/

import React from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import { get, isEmpty, map, mapKeys, isObject, reject, includes } from 'lodash';
import { FormattedMessage } from 'react-intl';
import DateTime from 'react-datetime';
import DateTimeStyle from 'react-datetime/css/react-datetime.css';
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
      const target = { name: this.props.name, value: this.props.selectOptions[0].value  };
      this.props.handleChange({ target });
    }

    if (this.props.value && !isEmpty(this.props.value)) {
      this.setState({ hasInitialValue: true });
    }

    if (!isEmpty(this.props.errors)) {
      this.setState({ errors: this.props.errors });
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.type === 'select' && this.props.selectOptionsFetchSucceeded !== nextProps.selectOptionsFetchSucceeded && nextProps.selectOptions[0].value !== '') {
      const target = { name: nextProps.name, value: nextProps.selectOptions[0].value  };
      this.props.handleChange({ target });
    }

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
    const requiredError = { id: `${this.props.pluginID}.error.validation.required` };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'max':
          if (parseInt(value, 10) > validationValue) {
            errors.push({ id: `${this.props.pluginID}.error.validation.max` });
          }
          break;
        case 'maxLength':
          if (value.length > validationValue) {
            errors.push({ id: `${this.props.pluginID}.error.validation.maxLength` });
          }
          break;
        case 'min':
          if (parseInt(value, 10) < validationValue) {
            errors.push({ id: `${this.props.pluginID}.error.validation.min` });
          }
          break;
        case 'minLength':
          if (value.length < validationValue) {
            errors.push({ id: `${this.props.pluginID}.error.validation.minLength` });
          }
          break;
        case 'required':
          if (value.length === 0) {
            errors.push({ id: `${this.props.pluginID}.error.validation.required` });
          }
          break;
        case 'regex':
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: `${this.props.pluginID}.error.validation.regex` });
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


  handleChangeCheckbox = (e) => {
    const target = {
      type: e.target.type,
      value: !this.props.value,
      name: e.target.name,
    };

    this.props.handleChange({ target });
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
      <div className={`${styles.inputCheckbox} ${requiredClass} ${this.props.customBootstrapClass || 'col-md-3'}`}>
        <div className="form-check">
          {title}
          <FormattedMessage id={this.props.label} defaultMessage={this.props.label}>
            {(message) => (
              <label className={`${styles.checkboxLabel} form-check-label`} htmlFor={this.props.label}>
                <input className="form-check-input" type="checkbox" defaultChecked={this.props.value} onChange={this.handleChangeCheckbox} name={this.props.name} />
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
    )
  }

  renderInputSelect = (requiredClass, inputDescription) => {
    const spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;
    return (
      <div className={`${styles.input} ${requiredClass} ${this.props.customBootstrapClass || 'col-md-4'}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <select
          className="form-control"
          id={this.props.label}
          name={this.props.name}
          onChange={this.props.handleChange}
          value={this.props.value}
          disabled={this.props.disabled}
        >
          {map(this.props.selectOptions, (option, key) => (
            <FormattedMessage id={`${option.name}`} defaultMessage={option.name} key={key}>
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

  renderInputTextArea = (requiredClass, bootStrapClassDanger, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.inputTextArea} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass} ${bootStrapClassDanger}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <FormattedMessage id={this.props.placeholder || this.props.label} defaultMessage={this.props.label}>
          {(placeholder) => (
            <textarea
              className="form-control"
              onChange={this.props.handleChange}
              value={this.props.value}
              name={this.props.name}
              id={this.props.label}
              onBlur={handleBlur}
              onFocus={this.props.handleFocus}
              placeholder={placeholder}
              disabled={this.props.disabled}
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

  renderInputDate = (requiredClass, inputDescription) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    const value = isObject(this.props.value) && this.props.value._isAMomentObject === true ?
      this.props.value :
      moment(this.props.value);

    return (
      <div className={`${styles.inputDate} ${styles.input} ${this.props.customBootstrapClass || 'col-md-4'} ${requiredClass}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <DateTime
          value={value}
          dateFormat='YYYY-MM-DD'
          timeFormat='HH:mm:ss'
          utc={true}
          inputProps={{
            placeholder: this.props.placeholder,
            className: 'form-control',
            name: this.props.name,
            id: this.props.label,
          }}
          onChange={(moment) => this.props.handleChange({ target: {
            name: this.props.name,
            value: moment
          }})}
         />
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors(styles.errorContainerTextArea)}
        {spacer}
      </div>
    )
  }

  renderFormattedInput = (handleBlur, inputValue, placeholder) => (
    <FormattedMessage id={`${placeholder}`} defaultMessage={placeholder}>
      {(message) => (
        <input
          name={this.props.name}
          id={this.props.label}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type={this.props.type}
          className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
          placeholder={message}
          autoComplete="off"
          disabled={this.props.disabled}
        />
      )}
    </FormattedMessage>
  )

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    // set error class with override possibility
    const bootStrapClassDanger = !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'has-danger' : '';
    const placeholder = this.props.placeholder || this.props.label;

    const label = this.props.label ?
      <label htmlFor={this.props.label}><FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} /></label>
        : <label htmlFor={this.props.label} />;

    const requiredClass = get(this.props.validations, 'required') && this.props.addRequiredInputDesign ?
      styles.requiredClass : '';


    const input = placeholder ? this.renderFormattedInput(handleBlur, inputValue, placeholder)
      : <input
        name={this.props.name}
        id={this.props.label}
        onBlur={handleBlur}
        onFocus={this.props.handleFocus}
        onChange={this.props.handleChange}
        value={inputValue}
        type={this.props.type}
        className={`form-control ${this.state.errors? 'form-control-danger' : ''}`}
        placeholder={placeholder}
        disabled={this.props.disabled}
      />;

    const inputDescription = !isEmpty(this.props.inputDescription) ? <FormattedMessage id={this.props.inputDescription} /> : '';

    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    switch (this.props.type) {
      case 'select':
        return this.renderInputSelect(requiredClass, inputDescription);
      case 'textarea':
        return this.renderInputTextArea(requiredClass, bootStrapClassDanger, inputDescription, handleBlur);
      case 'checkbox':
        return this.renderInputCheckbox(requiredClass, inputDescription);
      case 'date':
        return this.renderInputDate(requiredClass, inputDescription);
      default:
    }

    const addonInput = this.props.addon ?
      <div className={`input-group ${styles.input}`} style={{ marginBottom: '1rem'}}>
        <span className={`input-group-addon ${styles.addon}`}><FormattedMessage id={this.props.addon} /></span>
        {input}
      </div> : input;
    return (
      <div className={`${styles.input} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass} ${bootStrapClassDanger}`}>
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
  handleBlur: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.bool,
  ]),
  handleChange: PropTypes.func.isRequired,
  handleFocus: PropTypes.func,
  inputDescription: PropTypes.string,
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  placeholder: PropTypes.string,
  pluginID: PropTypes.string,
  selectOptions: PropTypes.array,
  selectOptionsFetchSucceeded: PropTypes.bool,
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
