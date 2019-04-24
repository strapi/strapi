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
import PropTypes from 'prop-types';
import {
  isEmpty,
  includes,
  map,
  mapKeys,
  isObject,
  reject,
  union,
  uniqBy,
} from 'lodash';
import { FormattedMessage } from 'react-intl';
import WithInput from '../WithInput';

/* eslint-disable react/require-default-props  */
class InputNumber extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
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
      this.setState({
        errors: uniqBy(union(this.state.errors, nextProps.errors), 'id'),
      });
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
  };

  validate = value => {
    let errors = [];

    const requiredError = {
      id: 'settings-manager.request.error.validation.required',
    };
    mapKeys(this.props.validations, (validationValue, validationKey) => {
      switch (validationKey) {
        case 'required':
          if (value.length === 0) {
            errors.push({
              id: 'settings-manager.request.error.validation.required',
            });
          }
          break;
        default:
          errors = [];
      }
    });

    if (includes(errors, requiredError)) {
      errors = reject(errors, error => error !== requiredError);
    }
    return errors;
  };

  renderErrors = () => {
    // eslint-disable-line consistent-return
    if (!this.props.noErrorsDescription) {
      return map(this.state.errors, (error, key) => {
        const displayError =
          isObject(error) && error.id ? <FormattedMessage {...error} /> : error;
        return (
          <div
            key={key}
            className="form-control-feedback invalid-feedback"
            style={{ marginBottom: '1.8rem', fontSize: '1.3rem' }}
          >
            {displayError}
          </div>
        );
      });
    }
  };

  renderFormattedInput = (
    handleBlur,
    inputValue,
    placeholder,
    marginBottom,
  ) => (
    <FormattedMessage id={`settings-manager.${placeholder}`}>
      {message => (
        <input
          name={this.props.target}
          id={this.props.name}
          onBlur={handleBlur}
          onFocus={this.props.handleFocus}
          onChange={this.props.handleChange}
          value={inputValue}
          type="number"
          className={`form-control ${
            !isEmpty(this.state.errors) ? 'form-control-danger is-invalid' : ''
          }`}
          placeholder={message}
          style={{ marginBottom }}
        />
      )}
    </FormattedMessage>
  );

  render() {
    const inputValue = this.props.value || '';
    // override default onBlur
    const handleBlur = this.props.handleBlur || this.handleBlur;
    // override bootStrapClass
    const bootStrapClass = this.props.customBootstrapClass
      ? this.props.customBootstrapClass
      : 'col-md-4';
    // set error class with override possibility
    const bootStrapClassDanger =
      !this.props.deactivateErrorHighlight && !isEmpty(this.state.errors)
        ? 'has-danger'
        : '';
    const placeholder = this.props.placeholder || this.props.name;
    const marginBottomInput = isEmpty(this.state.errors) ? '4.3rem' : '2.4rem';
    const input = placeholder ? (
      this.renderFormattedInput(
        handleBlur,
        inputValue,
        placeholder,
        marginBottomInput,
      )
    ) : (
      <input
        type="number"
        name={this.props.target}
        id={this.props.name}
        value={inputValue}
        onBlur={handleBlur}
        onChange={this.props.handleChange}
        onFocus={this.props.handleFocus}
        className={`form-control ${
          !isEmpty(this.state.errors) ? 'form-control-danger is-invalid' : ''
        }`}
        placeholder={placeholder}
        style={{ marginBottom: marginBottomInput }}
      />
    );

    const requiredClass =
      this.props.validations.required && this.props.addRequiredInputDesign
        ? this.props.styles.stmrequiredClass
        : '';
    let marginTopSmall = this.props.inputDescription ? '-3rem' : '-1.5rem';

    if (!isEmpty(this.state.errors) && this.props.inputDescription)
      marginTopSmall = '-1.2rem';
    return (
      <div
        className={`${
          this.props.styles.stminputNumber
        } ${requiredClass} ${bootStrapClass} ${bootStrapClassDanger}`}
      >
        <label htmlFor={this.props.name}>
          <FormattedMessage id={`settings-manager.${this.props.name}`} />
        </label>
        {input}
        <small style={{ marginTop: marginTopSmall }}>
          {this.props.inputDescription}
        </small>
        {this.renderErrors()}
      </div>
    );
  }
}

InputNumber.propTypes = {
  addRequiredInputDesign: PropTypes.bool,
  customBootstrapClass: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  errors: PropTypes.oneOfType([PropTypes.bool, PropTypes.array]).isRequired,
  handleBlur: PropTypes.func,
  handleChange: PropTypes.func,
  handleFocus: PropTypes.func,
  inputDescription: PropTypes.string,
  name: PropTypes.string,
  noErrorsDescription: PropTypes.bool,
  placeholder: PropTypes.string,
  styles: PropTypes.object,
  target: PropTypes.string,
  validations: PropTypes.object,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default WithInput(InputNumber); // eslint-disable-line new-cap
