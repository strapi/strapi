/**
 *
 * InputAddon
 */

import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, isFunction, upperFirst } from 'lodash';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-autofocus */
class InputAddon extends React.Component {
  state = { isFocused: false };

  handleBlur = (e) => {
    this.setState({ isFocused: !this.state.isFocused });

    if (isFunction(this.props.onBlur)) {
      this.props.onBlur(e);
    }
  }

  handleFocus = (e) => {
    this.setState({ isFocused: !this.state.isFocused });
    this.props.onFocus(e);
  }

  render() {
    const {
      addon,
      autoFocus,
      className,
      deactivateErrorHighlight,
      disabled,
      error,
      name,
      onChange,
      placeholder,
      style,
      tabIndex,
      value,
    } = this.props;

    return (
      <div className={cn(styles.inputAddon, 'input-group', !isEmpty(className) && className)} style={style}>
        <FormattedMessage id={addon} defaultMessage={upperFirst(addon)}>
          {(message) => (
            <span
              className={cn(
                'input-group-addon',
                styles.addon,
                this.state.isFocused && styles.addonFocus,
                !deactivateErrorHighlight && error && styles.errorAddon,
              )}
            >
              {message}
            </span>
          )}
        </FormattedMessage>
        <FormattedMessage id={placeholder} defaultMessage={placeholder}>
          {(message) => (
            <input
              autoFocus={autoFocus}
              className={cn(
                'form-control',
                !deactivateErrorHighlight && error && 'is-invalid',
                !deactivateErrorHighlight && error && this.state.isFocused && styles.invalidAddon,
              )}
              disabled={disabled}
              id={name}
              name={name}
              onBlur={this.handleBlur}
              onChange={onChange}
              onFocus={this.handleFocus}
              placeholder={message}
              tabIndex={tabIndex}
              type="text"
              value={value}
            />
          )}
        </FormattedMessage>
      </div>
    );
  }
}

InputAddon.defaultProps = {
  addon: 'app.utils.placeholder.defaultMessage', // Prevent error from FormattedMessage
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  onBlur: () => {},
  onFocus: () => {},
  placeholder: 'app.utils.placeholder.defaultMessage',
  style: {},
  tabIndex: '0',
};

InputAddon.propTypes = {
  addon: PropTypes.string,
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.bool,
  ]),
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default InputAddon;
