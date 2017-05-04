/**
 *
 * TableRow
 *
 */

import React from 'react';
import { Link } from 'react-router';
import _ from 'lodash';

import styles from './styles.scss';

class TableRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.goEditPage = this.goEditPage.bind(this);
  }

  /**
   * Redirect to the edit page
   */
  goEditPage() {
    this.context.router.push(this.props.destination);
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
        return !_.isEmpty(value) ? value.toString() : '-';
      case 'integer':
        return !_.isEmpty(value) ? Number(value) : '-';
      default:
        return '-';
    }
  }

  render() {
    // Generate cells
    const cells = this.props.headers.map((header, i) => {
      // Default content
      let content = this.getDisplayedValue(header.type, this.props.record[header.name]);

      // Display a link if the current column is the `id` column
      if (header.name === this.props.primaryKey) {
        content = (
          <Link to={this.props.destination} className={styles.idLink}>
            {this.getDisplayedValue(header.type, this.props.record[header.name])}
          </Link>
        );
      }

      return (
        <td key={i} className={styles.tableRowCell}>
          {content}
        </td>
      );
    });

    return (
      <tr className={styles.tableRow} onClick={() => this.goEditPage(this.props.destination)}>
        {cells}
        <td className={styles.actions}>
          <Link to={this.props.destination}>
            <i className="ion ion-edit"></i>
          </Link>
          <Link to={this.props.destination}>
            <i className="ion ion-close-round"></i>
          </Link>
        </td>
      </tr>
    );
  }
}

TableRow.contextTypes = {
  router: React.PropTypes.object.isRequired
};

TableRow.propTypes = {
  headers: React.PropTypes.array,
  record: React.PropTypes.object,
  destination: React.PropTypes.string,
  history: React.PropTypes.object,
  primaryKey: React.PropTypes.string,
};

export default TableRow;
