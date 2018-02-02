/**
 * InputToggle
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty } from 'lodash';

import styles from './styles.scss';

class InputToggle extends React.Component {
  handleClick = (e) => {
    const target = {
      name: this.props.name,
      type: 'toggle',
      value: e.target.id === 'on',
    };

    this.props.onChange({ target });
  }

  render() {
    const {
      autoFocus,
      className,
      disabled,
      deactivateErrorHighlight,
      error,
      style,
      tabIndex,
      value,
    } = this.props;

    return (
      <div className={cn(
          'btn-group',
          styles.inputToggleContainer,
          !isEmpty(className) && className,
          disabled && styles.disabled,
          !deactivateErrorHighlight && error && styles.error,
        )}
        style={style}
      >
        <button
          autoFocus={autoFocus}
          disabled={disabled}
          className={cn('btn', !value && styles.gradientOff)}
          id="off"
          onClick={this.handleClick}
          tabIndex={tabIndex}
          type="button"
        >
          OFF
        </button>
        <button
          disabled={disabled}
          className={cn('btn', value && styles.gradientOn)}
          id="on"
          onClick={this.handleClick}
          type="button"
        >
          ON
        </button>
      </div>
    );
  }
}

InputToggle.defaultProps = {
  autoFocus: false,
  className: '',
  deactivateErrorHighlight: false,
  disabled: false,
  error: false,
  style: {},
  tabIndex: '0',
  value: true,
};

InputToggle.propTypes = {
  autoFocus: false,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.bool,
};

export default InputToggle;
