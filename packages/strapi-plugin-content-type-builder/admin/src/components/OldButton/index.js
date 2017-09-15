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
    if (this.props.loader) {
      return (
        <button {...this.props}  type="submit" className={`${styles.primary} ${styles.loader} ${styles[this.props.buttonSize]}`} disabled>
          <div className={styles.saving}>
            <span>.</span><span>.</span><span>.</span>
          </div>
        </button>
      )
    }

    const label = this.props.handlei18n ? <FormattedMessage id={this.props.label} /> : this.props.label;
    const addShape = this.props.addShape ? <i className="fa fa-plus" /> : '';
    return (
      <button className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`} {...this.props}>
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
