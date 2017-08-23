/**
*
* TableList
*
*/

import React from 'react';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';
import ButtonPrimaryHotline from 'components/Button';
import TableListRow from 'components/TableListRow';
import styles from './styles.scss';

class TableList extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.tableListContainer}>
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

          <div className="row">
            <div className={styles.ulContainer}>
              <ul>
                <li>
                  <div className={`${styles.liHeaderContainer} row`}>
                    <div className="col-md-1"></div>
                    <div className="col-md-2"><FormattedMessage {...{ id: 'table.contentType.head.name' }} /></div>
                    <div className="col-md-5 text-center"><FormattedMessage {...{ id: 'table.contentType.head.description' }} /></div>
                    <div className="col-md-3 text-center"><FormattedMessage {...{ id: 'table.contentType.head.fields' }} /></div>
                    <div className="col-md-1"></div>
                  </div>
                </li>
                {map(this.props.rowItems, (rowItem, key) => (
                  <TableListRow key={key} rowItem={rowItem} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

TableList.propTypes = {
  availableNumber: React.PropTypes.number.isRequired,
  buttonLabel: React.PropTypes.string.isRequired,
  handleButtonClick: React.PropTypes.func,
  rowItems: React.PropTypes.array.isRequired,
  title: React.PropTypes.string.isRequired,
};

export default TableList;
