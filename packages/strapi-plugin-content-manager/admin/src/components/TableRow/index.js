/**
 *
 * TableRow
 *
 */

import React from 'react';
import _ from 'lodash';

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
    switch (type) {
      case 'string':
        return !_.isEmpty(value.toString()) ? value.toString() : '-';
      case 'integer':
        return !_.isEmpty(value.toString()) ? value.toString() : '-';
      case 'boolean':
        return value.toString();
      default:
        return '-';
    }
  }

  // Redirect to the edit page
  handleClick() {
    this.context.router.history.push(this.props.destination);
  }

  render() {
    // Generate cells
    const cells = this.props.headers.map((header, i) => (
      <td key={i}>
        {this.getDisplayedValue(
          header.type,
          this.props.record[header.name]
        )}
      </td>
    ));

    // Add actions cell.
    cells.push(
      <td key='action' className={styles.actions}>
        <i className="fa fa-pencil" aria-hidden="true"></i>
        <i className="fa fa-trash" aria-hidden="true"></i>
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
  router: React.PropTypes.object.isRequired,
};

TableRow.propTypes = {
  destination: React.PropTypes.string.isRequired,
  headers: React.PropTypes.array.isRequired,
  record: React.PropTypes.object.isRequired,
};

export default TableRow;
