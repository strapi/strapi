/**
 *
 * Button
 *
 */

import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import styles from './styles.scss';

class Button extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    const label = this.props.handlei18n ? <FormattedMessage id={this.props.label} values={this.props.labelValues} /> : this.props.label;
    const addShape = this.props.addShape ? <i className="fa fa-plus" /> : '';

    return (
      <button
        className={`${styles[this.props.buttonSize]} ${styles[this.props.buttonBackground]} ${styles.button}`}
        onClick={this.props.onClick}
        >
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
  label: PropTypes.string.isRequired,
};

export default Button;
