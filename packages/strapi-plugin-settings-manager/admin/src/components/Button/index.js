/**
 *
 * Button
 *
 */

import React from 'react';
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
  addShape: React.PropTypes.bool.isRequired,
  buttonBackground: React.PropTypes.string.isRequired,
  buttonSize: React.PropTypes.string.isRequired,
  handlei18n: React.PropTypes.bool.isRequired,
  label: React.PropTypes.string.isRequired.isRequired,
};

export default Button;
