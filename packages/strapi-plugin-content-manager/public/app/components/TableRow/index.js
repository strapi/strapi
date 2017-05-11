/**
 *
 * TableRow
 *
 */

import React from 'react';
import { Link } from 'react-router';
import _ from 'lodash';

import styles from './styles.scss';

class TableRow extends React.Component {
  constructor(props) {
    super(props);
    this.goEditPage = this.goEditPage.bind(this);
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

  /**
   * Redirect to the edit page
   */
  goEditPage() {
    this.context.router.push(this.props.destination);
  }

  render() {
    // Generate cells
    const cells = this.props.headers.map((header, i) => {
      // Default content
      let content = this.getDisplayedValue(
        header.type,
        this.props.record[header.name]
      );

      // Display a link if the current column is the `id` column
      if (header.name === this.props.primaryKey) {
        content = (
          <Link to={this.props.destination} className={styles.idLink}>
            {this.getDisplayedValue(
              header.type,
              this.props.record[header.name]
            )}
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
      <tr // eslint-disable-line jsx-a11y/no-static-element-interactions
        className={styles.tableRow}
        onClick={() => this.goEditPage(this.props.destination)}
      >
        {cells}
        <td className={styles.actions}>
          <Link to={this.props.destination}>
            <i className="ion ion-edit" />
          </Link>
          <Link to={this.props.destination}>
            <i className="ion ion-close-round" />
          </Link>
        </td>
      </tr>
    );
  }
}

TableRow.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

TableRow.propTypes = {
  headers: React.PropTypes.array.isRequired,
  record: React.PropTypes.object.isRequired,
  destination: React.PropTypes.string.isRequired,
  primaryKey: React.PropTypes.string.isRequired,
};

export default TableRow;
