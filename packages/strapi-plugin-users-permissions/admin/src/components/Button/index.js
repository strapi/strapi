/**
 *
 * Button
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

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
  label: PropTypes.string.isRequired,
};

export default Button;
