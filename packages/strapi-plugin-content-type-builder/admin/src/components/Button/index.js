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
    const label = this.props.handlei18n ? <FormattedMessage id={this.props.label} /> : this.props.label;
    const addShape = this.props.addShape ? <i className="fa fa-plus" /> : '';
    if (this.props.loader) {
      return (
        <button {...this.props}  type="submit" className={`${styles.primary} ${styles.loader} ${styles[this.props.buttonSize]}`} disabled>
          <div className={styles.saving}>
            <span>.</span><span>.</span><span>.</span>
          </div>
        </button>
      )
    }
    return (
      <button className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`} {...this.props}>
        {addShape}{label}
      </button>
    );
  }
}

Button.propTypes = {
  addShape: React.PropTypes.bool,
  buttonBackground: React.PropTypes.string,
  buttonSize: React.PropTypes.string,
  handlei18n: React.PropTypes.bool,
  label: React.PropTypes.string.isRequired,
  loader: React.PropTypes.bool,
};

export default Button;
