/**
 *
 * InputPassword
 *
 */

import React, { Fragment } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { isEmpty } from 'lodash';
import cn from 'classnames';

import styles from './styles.scss';

/* eslint-disable jsx-a11y/no-autofocus */
class InputPassword extends React.Component {
  state = { showPassword: false };

  handleClick = () => this.setState({ showPassword: !this.state.showPassword });

  render() {
    const {
      autoFocus,
      className,
      deactivateErrorHighlight,
      disabled,
      error,
      name,
      onBlur,
      onChange,
      onFocus,
      placeholder,
      style,
      tabIndex,
      value,
    } = this.props;
    const formattedPlaceholder = placeholder === '' ? 'app.utils.placeholder.defaultMessage' : placeholder;
    const eyeColor = this.state.showPassword ? { color: 'black' }  : { color: '#9EA7B8' };

    return (
      <Fragment>
        <FormattedMessage id={formattedPlaceholder} defaultMessage={formattedPlaceholder}>
          {(message) => (
            <input
              autoComplete="new-password"
              autoFocus={autoFocus}
              className={cn(
                styles.inputPassword,
                'form-control',
                !deactivateErrorHighlight && error && 'is-invalid',
                !isEmpty(className)&& className,
              )}
              disabled={disabled}
              id={name}
              name={name}
              onBlur={onBlur}
              onChange={onChange}
              onFocus={onFocus}
              placeholder={message}
              style={style}
              tabIndex={tabIndex}
              type={!this.state.showPassword && 'password' || 'text'}
              value={value}
            />
          )}
        </FormattedMessage>
        <div className={styles.iconEyeWrapper}>
          <div className={styles.iconEyeSubWrapper} onClick={this.handleClick} style={eyeColor}>
            <i className="fa fa-eye" />
          </div>
        </div>
      </Fragment>
    );
  }
}

InputPassword.defaultProps = {
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

InputPassword.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onBlur: PropTypes.func,
  onChange: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  placeholder: PropTypes.string,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.string.isRequired,
};

export default InputPassword;
