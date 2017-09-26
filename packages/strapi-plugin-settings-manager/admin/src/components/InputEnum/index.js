/**
*
* InputEnum
*
*/

import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import styles from './styles.scss';

class InputEnum extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const customBootstrapClass = this.props.customBootstrapClass ? this.props.customBootstrapClass : 'col-md-6';

    return (
      <div className={`${styles.inputEnum} ${customBootstrapClass}`}>
        <div className={styles.enumLabel}>
          <FormattedMessage id={`settings-manager.${this.props.name}`} />
        </div>
        <div className="btn-group" data-toggle="buttons">
          {map(this.props.selectOptions, (option, key) => {
            const isChecked = this.props.value === option.value;
            const active = isChecked ? styles.active : "";
            return (
              <label className={`btn ${styles.button} ${active}`} key={key} htmlFor={option.name}>
                <FormattedMessage id={`settings-manager.${option.name}`} />
                <input
                  type="radio"
                  name={this.props.target}
                  id={option.name}
                  checked={isChecked}
                  autoComplete="off"
                  value={option.value}
                  onChange={this.props.handleChange}
                />
              </label>
            )
          })}
        </div>
      </div>
    );
  }
}

InputEnum.propTypes = {
  customBootstrapClass: PropTypes.string.isRequired,
  handleChange: PropTypes.func.isRequired,
  name: PropTypes.string.isRequired,
  selectOptions: PropTypes.array.isRequired,
  target: PropTypes.string.isRequired,
  value: PropTypes.any.isRequired,
}

export default InputEnum;
