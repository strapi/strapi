/**
*
* TableList
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import { FormattedMessage } from 'react-intl';

import Button from 'components/Button';
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
                <Button
                  secondaryHotlineAdd
                  label={this.props.buttonLabel}
                  onClick={this.props.onButtonClick}
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
                    <div className="col-md-3"><FormattedMessage {...{ id: 'content-type-builder.table.contentType.head.name' }} /></div>
                    <div className="col-md-5 text-center"><FormattedMessage {...{ id: 'content-type-builder.table.contentType.head.description' }} /></div>
                    <div className="col-md-2 text-center"><FormattedMessage {...{ id: 'content-type-builder.table.contentType.head.fields' }} /></div>
                    <div className="col-md-1"></div>
                  </div>
                </li>
                {map(this.props.rowItems, (rowItem, key) => (
                  <TableListRow key={key} rowItem={rowItem} onDelete={this.props.onHandleDelete} />
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
  availableNumber: PropTypes.number.isRequired,
  buttonLabel: PropTypes.string.isRequired,
  onButtonClick: PropTypes.func.isRequired,
  onHandleDelete: PropTypes.func.isRequired,
  rowItems: PropTypes.array.isRequired,
  title: PropTypes.string.isRequired,
};

export default TableList;
