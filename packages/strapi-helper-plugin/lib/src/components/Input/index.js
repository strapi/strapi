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
      showPassword: false,
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

  handleChangeCheckbox = (e) => {
    const target = {
      type: 'checkbox',
      value: !this.props.value,
      name: this.props.name,
    };

    this.props.onChange({ target });
  }

  handleToggle = (e) => {
    const target = {
      type: 'toggle',
      name: this.props.name,
      value: e.target.id === 'on',
    }

    this.props.onChange({ target });
  }

  handleShowPassword = () => this.setState({ showPassword: !this.state.showPassword });

  renderErrors = (errorStyles) => { // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      const divStyle = errorStyles || styles.errorContainer;

      return (
        map(this.state.errors, (error, key) => {
          const displayError = isObject(error) && error.id
            ? <FormattedMessage {...error} />
            : error;
          return (
            <div key={key} className={`form-control-feedback invalid-feedback ${divStyle}`} style={{ display: 'block' }}>{displayError}</div>
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
          <FormattedMessage id={this.props.label} values={this.props.labelValues}>
            {(message) => (
              <label className={`${styles.checkboxLabel} form-check-label`} htmlFor={this.props.name}>
                <input
                  className="form-check-input"
                  defaultChecked={this.props.value}
                  id={this.props.name}
                  name={this.props.name}
                  onChange={this.handleChangeCheckbox}
                  type="checkbox"
                />
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
          onChange={(moment) => this.props.onChange({ target: {
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

  renderInputEmail = (requiredClass, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.input} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} />
        </label>
        <div className={`input-group ${styles.input}`} style={{ marginBottom: '1rem'}}>
          <span className={`input-group-addon ${styles.addonEmail}`} />
          <FormattedMessage id={this.props.placeholder || this.props.label} values={this.props.labelValues}>
            {(placeholder) => (
              <input
                className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'form-control-danger is-invalid': ''}`}
                onChange={this.props.onChange}
                value={this.props.value}
                name={this.props.name}
                id={this.props.label}
                onBlur={this.props.onBlur || this.handleBlur}
                onFocus={this.props.onFocus}
                placeholder={placeholder}
                disabled={this.props.disabled}
                type="email"
                autoFocus={this.props.autoFocus}
              />
            )}
          </FormattedMessage>
        </div>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors()}
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
          onFocus={this.props.onFocus}
          onChange={this.props.onChange}
          value={inputValue}
          type={this.props.type}
          className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors)? 'form-control-danger is-invalid' : ''}`}
          placeholder={message}
          autoComplete="off"
          disabled={this.props.disabled}
          autoFocus={this.props.autoFocus}
        />
      )}
    </FormattedMessage>
  )

  renderInputPassword = (requiredClass, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    const color = this.state.showPassword ? { color: 'black' } : { color: '#9EA7B8' };
    const type = this.state.showPassword ? 'text' : 'password';

    return (
      <div className={`${styles.input} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <FormattedMessage id={this.props.placeholder || this.props.label} values={this.props.labelValues}>
          {(placeholder) => (
            <input
              className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'is-invalid': ''}`}
              onChange={this.props.onChange}
              value={this.props.value}
              name={this.props.name}
              id={this.props.label}
              onBlur={handleBlur}
              onFocus={this.props.onFocus}
              placeholder={placeholder}
              disabled={this.props.disabled}
              type={type}
              autoFocus={this.props.autoFocus}
            />
          )}
        </FormattedMessage>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {this.renderErrors()}
        {spacer}
        <div className={styles.insideInput} onClick={this.handleShowPassword} style={color}>
          <i className="fa fa-eye" />
        </div>
      </div>
    );
  }

  renderInputSelect = (requiredClass, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.input} ${requiredClass} ${this.props.customBootstrapClass || 'col-md-6'}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} />
        </label>
        <select
          className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'is-invalid': ''}`}
          id={this.props.label}
          name={this.props.name}
          onChange={this.props.onChange}
          value={this.props.value}
          disabled={this.props.disabled}
          onBlur={handleBlur}
          tabIndex={this.props.tabIndex}
          autoFocus={this.props.autoFocus}
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
              <option value={option.value} key={key}>{option.value}</option>
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

  renderInputSearch = (requiredClass, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.input} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <div className={`input-group ${styles.input}`} style={{ marginBottom: '1rem'}}>
          <span className={`input-group-addon ${styles.addonSearch}`} />
          <FormattedMessage id={this.props.placeholder || this.props.label} defaultMessage={this.props.label}>
            {(placeholder) => (
              <input
                className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'is-invalid': ''}`}
                onChange={this.props.onChange}
                value={this.props.value}
                name={this.props.name}
                id={this.props.label}
                onBlur={handleBlur}
                onFocus={this.props.onFocus}
                placeholder={placeholder}
                disabled={this.props.disabled}
                type="text"
                autoFocus={this.props.autoFocus}
              />
            )}
          </FormattedMessage>
        </div>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        <div>
          {this.renderErrors()}
          {spacer}
        </div>
      </div>
    );
  }

  renderInputTextArea = (requiredClass, inputDescription, handleBlur) => {
    let spacer = !isEmpty(this.props.inputDescription) ? <div className={styles.spacer} /> : <div />;

    if (!this.props.noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    return (
      <div className={`${styles.inputTextArea} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass}`}>
        <label htmlFor={this.props.label}>
          <FormattedMessage id={`${this.props.label}`} defaultMessage={this.props.label} />
        </label>
        <FormattedMessage id={this.props.placeholder || this.props.label}>
          {(placeholder) => (
            <textarea
              className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'is-invalid': ''}`}
              onChange={this.props.onChange}
              value={this.props.value}
              name={this.props.name}
              id={this.props.label}
              onBlur={handleBlur}
              onFocus={this.props.onFocus}
              placeholder={placeholder}
              disabled={this.props.disabled}
              autoFocus={this.props.autoFocus}
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

  renderInputToggle = () => {
    const btnClassOff = this.props.value ? 'btn' : `btn ${styles.gradientOff}`;
    const btnClassOn = this.props.value ? `btn ${styles.gradientOn}` : 'btn';
    const spacer = this.props.inputDescription ? <div className={styles.spacer} /> : <div />;
    const inputDescription = this.props.inputDescription ?
      <FormattedMessage id={this.props.inputDescription} /> : '';

    return (
      <div className={`${this.props.customBootstrapClass || 'col-md-6'} ${styles.inputToggle}`}>
        <div className={styles.toggleLabel}>
          <FormattedMessage id={this.props.label} values={this.props.labelValues} />
        </div>
        <div className={`btn-group ${styles.inputToggleButtons}`}>
          <button type="button" className={btnClassOff} id="off" onClick={this.handleToggle}>OFF</button>
          <button type="button" className={btnClassOn} id="on" onClick={this.handleToggle}>ON</button>
        </div>
        <div className={styles.inputDescriptionContainer}>
          <small>{inputDescription}</small>
        </div>
        {spacer}
      </div>
    );
  }

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.onBlur || this.handleBlur;
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
        onFocus={this.props.onFocus}
        onChange={this.props.onChange}
        value={inputValue}
        type={this.props.type}
        className={`form-control ${!this.props.deactivateErrorHighlight && !isEmpty(this.state.errors) ? 'is-invalid': ''}`}
        placeholder={placeholder}
        disabled={this.props.disabled}
        autoFocus={this.props.autoFocus}
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

    if (this.props.search) {
      return this.renderInputSearch(requiredClass, inputDescription, handleBlur);
    }

    switch (this.props.type) {
      case 'select':
        return this.renderInputSelect(requiredClass, inputDescription, handleBlur);
      case 'textarea':
        return this.renderInputTextArea(requiredClass, inputDescription, handleBlur);
      case 'checkbox':
        return this.renderInputCheckbox(requiredClass, inputDescription);
      case 'date':
        return this.renderInputDate(requiredClass, inputDescription);
      case 'password':
        return this.renderInputPassword(requiredClass, inputDescription, handleBlur);
      case 'toggle':
        return this.renderInputToggle();
      case 'email':
        return this.renderInputEmail(requiredClass, inputDescription, handleBlur);
      default:
    }

    const addonInput = this.props.addon ?
      <div className={`input-group ${styles.input}`} style={{ marginBottom: '1rem'}}>
        <span className={`input-group-addon ${styles.addon}`}><FormattedMessage id={this.props.addon} /></span>
        {input}
      </div> : input;
    return (
      <div className={`${styles.input} ${this.props.customBootstrapClass || 'col-md-6'} ${requiredClass}`}>
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

  validate = (value) => {
    let errors = [];

    const emailRegex = new RegExp(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
    // handle i18n
    const requiredError = { id: 'components.Input.error.validation.required' };

    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'max':
          if (parseInt(value, 10) > validationValue) {
            errors.push({ id: 'components.Input.error.validation.max' });
          }
          break;
        case 'maxLength':
          if (value.length > validationValue) {
            errors.push({ id: 'components.Input.error.validation.maxLength' });
          }
          break;
        case 'min':
          if (parseInt(value, 10) < validationValue) {
            errors.push({ id: 'components.Input.error.validation.min' });
          }
          break;
        case 'minLength':
          if (value.length < validationValue) {
            errors.push({ id: 'components.Input.error.validation.minLength' });
          }
          break;
        case 'required':
          if (value.length === 0) {
            errors.push({ id: 'components.Input.error.validation.required' });
          }
          break;
        case 'regex':
          if (!new RegExp(validationValue).test(value)) {
            errors.push({ id: 'components.Input.error.validation.regex' });
          }
          break;
        default:
          errors = [];
      }
    });

    if (this.props.type === 'email' && !emailRegex.test(value)) {
      errors.push({ id: 'components.Input.error.validation.email' });
    }

    if (includes(errors, requiredError)) {
      errors = reject(errors, (error) => error !== requiredError);
    }

    return errors;
  }
}

Input.propTypes = {
  addon: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
  addRequiredInputDesign: PropTypes.bool,
  autoFocus: PropTypes.bool,
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  errors: PropTypes.array,
  inputDescription: PropTypes.string,
  label: PropTypes.string.isRequired,
  labelValues: PropTypes.object,
  linkContent: PropTypes.shape({
    link: PropTypes.string,
    description: PropTypes.string,
  }),
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  placeholder: PropTypes.string,
  search: PropTypes.bool,
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

Input.defaultProps = {
  addon: false,
  addRequiredInputDesign: false,
  autoFocus: false,
  deactivateErrorHighlight: false,
  didCheckErrors: false,
  disabled: false,
  errors: [],
  inputDescription: '',
  labelValues: {},
  linkContent: {},
  noErrorsDescription: false,
  onBlur: false,
  onFocus: () => {},
  placeholder: '',
  search: false,
  selectOptions: [],
  selectOptionsFetchSucceeded: false,
  value: ''
};

export default Input;
