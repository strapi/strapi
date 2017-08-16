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
      <button className={`btn btn-primary ${styles.button}`} {...this.props}>
        {this.props.label}
      </button>
    );
  }
}

Button.propTypes = {
  label: React.PropTypes.string.isRequired,
};

export default Button;
