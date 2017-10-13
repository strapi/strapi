/**
 *
 * Button
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

/* eslint-disable react/require-default-props  */
class Button extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    const label = this.props.handlei18n ? <FormattedMessage id={`settings-manager.${this.props.label}`} /> : this.props.label;
    const addShape = this.props.addShape ? <i className="fa fa-plus" /> : '';

    const buttonProps = Object.assign({}, this.props);
    const propsToDelete = ['addShape', 'buttonBackground', 'buttonSize', 'handlei18n', 'label', 'loader'];

    propsToDelete.map((value) => delete buttonProps[value]);

    if (this.props.loader) {
      return (
        <button
          type="button"
          className={cn(styles.loader, styles.primary)}
          disabled
        >
          <div className={styles.saving}>
            <p></p><p></p><p></p>
          </div>
        </button>
      );
    }
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
  loader: PropTypes.bool,
};

export default Button;
