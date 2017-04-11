/**
 *
 * TableRow
 *
 */

import React from 'react';
import { Link } from 'react-router';

import styles from './styles.scss';

class TableRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const cells = this.props.headers.map((header, i) => (<td key={i} className={styles.tableRowCell}>{this.props.record[header.name]}</td>));

    return (
      <tr className={styles.tableRow}>
        <td scope="row" className={styles.tableRowCell}>
          <Link to={this.props.destination}>{this.props.record['id']}</Link>
        </td>
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

TableRow.propTypes = {
  headers: React.PropTypes.array,
  record: React.PropTypes.object,
  destination: React.PropTypes.string,
};

export default TableRow;
