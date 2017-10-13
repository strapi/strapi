/**
 *
 * TableRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { isEmpty, isObject } from 'lodash';

import styles from './styles.scss';

class TableRow extends React.Component {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Return a formatted value according to the
   * data type and value stored in database
   *
   * @param type  {String} Data type
   * @param value {*}      Value stored in database
   * @returns {*}
   */
  getDisplayedValue(type, value) {
    switch (type.toLowerCase()) {
      case 'string':
      case 'text':
        return value && !isEmpty(value.toString()) ? value.toString() : '-';
      case 'float':
      case 'integer':
      case 'biginteger':
        return value && !isEmpty(value.toString()) ? value.toString() : '-';
      case 'boolean':
        return value && !isEmpty(value.toString()) ? value.toString() : '-';
      case 'date':
      case 'time':
      case 'datetime':
      case 'timestamp': {
        const date = value && isObject(value) && value._isAMomentObject === true ?
          value :
          moment(value);

        return date.utc().format('YYYY-MM-DD HH:mm:ss')
      }
      default:
        return '-';
    }
  }

  // Redirect to the edit page
  handleClick() {
    this.context.router.history.push(`${this.props.destination}${this.props.redirectUrl}`);
  }

  render() {
    // Generate cells
    const cells = this.props.headers.map((header, i) => (
      <td key={i}>
        <div className={styles.truncate}>
          <div className={styles.truncated}>
            {this.getDisplayedValue(
              header.type,
              this.props.record[header.name]
            )}
          </div>
        </div>
      </td>
    ));

    // Add actions cell.
    cells.push(
      <td key='action' className={styles.actions}>
        <i className="fa fa-pencil" aria-hidden="true"></i>
        <i onClick={this.props.handleDelete} id={this.props.record.id} className="fa fa-trash" aria-hidden="true"></i>
      </td>
    );

    return (
      <tr className={styles.tableRow} onClick={() => this.handleClick(this.props.destination)}>
        {cells}
      </tr>
    );
  }
}

TableRow.contextTypes = {
  router: PropTypes.object.isRequired,
};

TableRow.propTypes = {
  destination: PropTypes.string.isRequired,
  handleDelete: PropTypes.func,
  headers: PropTypes.array.isRequired,
  record: PropTypes.object.isRequired,
  redirectUrl: PropTypes.string.isRequired,
};

TableRow.defaultProps = {
  handleDelete: () => {},
};

export default TableRow;
