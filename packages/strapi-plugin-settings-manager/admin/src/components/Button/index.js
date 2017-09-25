/**
 *
 * Button
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class Button extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    const label = this.props.handlei18n ? <FormattedMessage id={`settings-manager.${this.props.label}`} /> : this.props.label;
    const addShape = this.props.addShape ? <i className="fa fa-plus" /> : '';
    return (
      <button className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`} {...this.props}>
        {addShape}{label}
      </button>
    );
  }
}

Button.propTypes = {
  addShape: PropTypes.bool.isRequired,
  buttonBackground: PropTypes.string.isRequired,
  buttonSize: PropTypes.string.isRequired,
  handlei18n: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
};

export default Button;
