/**
 *
 * Button
 *
 */

import React from 'react';

import styles from './styles.scss';

class Button extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <button className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`} {...this.props}>
        {this.props.label}
      </button>
    );
  }
}

Button.propTypes = {
  buttonBackground: React.PropTypes.string,
  buttonSize: React.PropTypes.string,
  label: React.PropTypes.string.isRequired,
};

export default Button;
