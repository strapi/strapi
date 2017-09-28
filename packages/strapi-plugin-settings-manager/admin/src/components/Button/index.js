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

    const buttonProps = Object.assign({}, this.props);
    const propsToDelete = ['addShape', 'buttonBackground', 'buttonSize', 'handlei18n', 'label'];

    propsToDelete.map((value) => delete buttonProps[value]);
    return (
      <button className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`} {...buttonProps}>
        {addShape}{label}
      </button>
    );
  }
}

Button.propTypes = {
  addShape: PropTypes.bool,
  buttonBackground: PropTypes.string,
  buttonSize: PropTypes.string,
  handlei18n: PropTypes.bool,
  label: PropTypes.string,
};

export default Button;
