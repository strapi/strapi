/**
 *
 * InputCheckboxWithErrors
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isObject, isFunction } from 'lodash';
import cn from 'classnames';

// Design
import InputDescription from '../InputDescription';
import InputErrors from '../InputErrors';
import InputCheckbox from '../InputCheckbox';
import InputSpacer from '../InputSpacer';

import styles from './styles.scss';

class InputCheckboxWithErrors extends React.Component {
  state = { errors: [] };

  componentDidMount() {
    // Display input error if it already has some
    const { errors } = this.props;
    if (!isEmpty(errors)) {
      this.setState({ errors });
    }
  }

  componentWillReceiveProps(nextProps) {
    // Check if errors have been updated during validations
    if (nextProps.didCheckErrors !== this.props.didCheckErrors) {
      // Remove from the state the errors that have already been set
      const errors = isEmpty(nextProps.errors) ? [] : nextProps.errors;
      this.setState({ errors });
    }
  }

  render () {
    const {
      autoFocus,
      className,
      customBootstrapClass,
      disabled,
      errorsClassName,
      errorsStyle,
      inputClassName,
      inputDescription,
      inputDescriptionClassName,
      inputDescriptionStyle,
      inputStyle,
      label,
      name,
      noErrorsDescription,
      onBlur,
      onChange,
      onFocus,
      placeholder,
      style,
      tabIndex,
      title,
      value,
    } = this.props;

    const handleBlur = onBlur ? onBlur : () => {};
    let inputTitle = '';

    let spacer = !isEmpty(inputDescription) ? <InputSpacer /> : <div />;

    if (!noErrorsDescription && !isEmpty(this.state.errors)) {
      spacer = <div />;
    }

    if (isObject(title) && title.id) {
      inputTitle = (
        <div className={styles.inputTitle}>
          <FormattedMessage id={title.id} defaultMessage={title.id} values={title.params} />
        </div>
      );
    }

    if (isFunction(title)) {
      inputTitle = title();
    }

    return (
      <div
        className={cn(
          styles.container,
          customBootstrapClass,
          !isEmpty(className) && className,
        )}
        style={style}
      >
        {inputTitle}
        <InputCheckbox
          autoFocus={autoFocus}
          className={inputClassName}
          disabled={disabled}
          label={label}
          name={name}
          onBlur={handleBlur}
          onChange={onChange}
          onFocus={onFocus}
          placeholder={placeholder}
          style={inputStyle}
          tabIndex={tabIndex}
          value={value}
        />
        <InputDescription
          className={cn(styles.inputCheckboxDescriptionContainer, inputDescriptionClassName)}
          message={this.props.inputDescription}
          style={inputDescriptionStyle}
        />
        <InputErrors
          className={errorsClassName}
          errors={this.state.errors}
          name={name}
          style={errorsStyle}
        />
        {spacer}
      </div>
    );
  }
}

InputCheckboxWithErrors.defaultProps = {
  autoFocus: false,
  className: '',
  customBootstrapClass: 'col-md-3',
  didCheckErrors: false,
  disabled: false,
  onBlur: () => {},
  onFocus: () => {},
  errors: [],
  errorsClassName: '',
  errorsStyle: {},
  inputClassName: '',
  inputDescription: '',
  inputDescriptionClassName: '',
  inputDescriptionStyle: {},
  inputStyle: {},
  label: '',
  noErrorsDescription: false,
  placeholder: 'app.utils.placeholder.defaultMessage',
  style: {},
  tabIndex: '0',
  title: '',
  value: false,
};
InputCheckboxWithErrors.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  customBootstrapClass: PropTypes.string,
  didCheckErrors: PropTypes.bool,
  disabled: PropTypes.bool,
  errors: PropTypes.array,
  errorsClassName: PropTypes.string,
  errorsStyle: PropTypes.object,
  inputClassName: PropTypes.string,
  inputDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  inputDescriptionClassName: PropTypes.string,
  inputDescriptionStyle: PropTypes.object,
  inputStyle: PropTypes.object,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  name: PropTypes.string.isRequired,
  noErrorsDescription: PropTypes.bool,
  onBlur: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.func,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  value: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
};

export default InputCheckboxWithErrors;
