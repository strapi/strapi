/**
 *
 * InputCheckbox
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isEmpty, isFunction, isObject } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable jsx-a11y/label-has-for */
class InputCheckbox extends React.Component {
  handleChange = () => {
    const target = {
      name: this.props.name,
      type: 'checkbox',
      value: !this.props.value,
    };

    this.props.onChange({ target });
  }

  render() {
    const {
      autoFocus,
      className,
      disabled,
      label,
      name,
      onBlur,
      onFocus,
      style,
      tabIndex,
      value,
    } = this.props;
    const checkbox = (
      <input
        autoFocus={autoFocus}
        className="form-check-input"
        checked={value}
        disabled={disabled}
        id={name}
        onBlur={onBlur}
        onChange={this.handleChange}
        onFocus={onFocus}
        tabIndex={tabIndex}
        type="checkbox"
      />
    );

    let content = <div />;

    if (typeof(label) === 'string') {
      content = (
        <label className={cn('form-check-label', disabled && styles.disabled)} htmlFor={name}>
          {checkbox}
          <p>{label}</p>
        </label>
      );
    }

    if (isFunction(label)) {
      content = (
        <label className={cn('form-check-label', disabled && styles.disabled)} htmlFor={name}>
          {checkbox}
          <p>{label()}</p>
        </label>
      );
    }

    if (isObject(label) && label.id) {
      content = (
        <FormattedMessage id={label.id} defaultMessage={label.id} values={label.params}>
          {(message) => (
            <label className={cn('form-check-label', disabled && styles.disabled)} htmlFor={name}>
              {checkbox}
              <p>{message}</p>
            </label>
          )}
        </FormattedMessage>
      );
    }
    return (
      <div
        className={cn(
          'form-check',
          styles.inputCheckbox,
          !isEmpty(className) && className,
        )}
        style={style}
      >
        {content}
      </div>
    );
  }
}

InputCheckbox.defaultProps = {
  autoFocus: false,
  className: '',
  disabled: false,
  label: '',
  onBlur: () => {},
  onFocus: () => {},
  style: {},
  tabIndex: '0',
  value: false,
};

InputCheckbox.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  disabled: PropTypes.bool,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.func,
    PropTypes.shape({
      id: PropTypes.string,
      params: PropTypes.object,
    }),
  ]),
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.string,
  ]),
};

export default InputCheckbox;
