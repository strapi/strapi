/**
 * InputToggle
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { isEmpty } from 'lodash';

import styles from './styles.scss';

class InputToggle extends React.Component {
  state = {
    value: this.props.value
  }

  handleClick(value) {

    // // Make value de-selectable (nullable) when clicking again on same value.
    // if (value === this.state.value)
    //   value = null;

    const target = {
      name: this.props.name,
      type: 'toggle',
      value
    };

    this.setState({ value });
    this.props.onChange({ target });
  }

  render() {
    const value = this.state.value;
    const {
      autoFocus,
      className,
      disabled,
      deactivateErrorHighlight,
      error,
      style,
      tabIndex
    } = this.props;

    return (
      <div
        className={cn(
          'btn-group',
          styles.inputToggleContainer,
          !isEmpty(className) && className,
          !deactivateErrorHighlight && error && styles.error
        )}
        style={style}
      >
        <button
          autoFocus={autoFocus}
          disabled={disabled}
          className = {cn('btn', value !== null && !value && styles.gradientOff)}
          onClick={this.handleClick.bind(this, false)}
          tabIndex={tabIndex}
          type="button"
        >
          OFF
        </button>
        <button
          disabled={disabled}
          className={cn('btn', value && styles.gradientOn)}
          onClick={this.handleClick.bind(this, true)}
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
  value: null
};

InputToggle.propTypes = {
  autoFocus: PropTypes.bool,
  className: PropTypes.string,
  deactivateErrorHighlight: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  style: PropTypes.object,
  tabIndex: PropTypes.string,
  value: PropTypes.bool
};

export default InputToggle;
