/**
 *
 * TableRow
 *
 */

import React from 'react';
import { Link } from 'react-router';

import styles from './styles.scss';

class TableRow extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.goEditPage = this.goEditPage.bind(this);
  }

  goEditPage() {
    this.context.router.push(this.props.destination);
  }

  render() {
    const cells = this.props.headers.map((header, i) => (<td key={i} className={styles.tableRowCell}>{this.props.record[header.name]}</td>));

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
};

export default TableRow;
