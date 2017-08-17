/**
*
* Table
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import ButtonPrimaryHotline from 'components/Button';
import styles from './styles.scss';

class Table extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.table}>
        <div className="container-fluid">
          <div className="row">
            <div className={styles.headerContainer}>
              <div className={styles.titleContainer}>
                {this.props.availableNumber}&nbsp;<FormattedMessage {...{ id: this.props.title }} />
              </div>
              <div className={styles.buttonContainer}>
                <ButtonPrimaryHotline
                  buttonBackground={'secondaryAddType'}
                  label={this.props.buttonLabel}
                  handlei18n
                  addShape
                  onClick={this.props.handleButtonClick}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

Table.propTypes = {
  availableNumber: React.PropTypes.number.isRequired,
  buttonLabel: React.PropTypes.string.isRequired,
  handleButtonClick: React.PropTypes.func,
  title: React.PropTypes.string.isRequired,
};

export default Table;
