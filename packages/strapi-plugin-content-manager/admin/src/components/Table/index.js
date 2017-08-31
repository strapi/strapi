/**
*
* Table
*
*/

import React from 'react';

import TableHeader from '../TableHeader';
import TableRow from '../TableRow';

import styles from './styles.scss';

class Table extends React.Component {
  render() {
    const tableRows = this.props.records.map((record, key) => {
      const destination = `${this.props.route.path.replace(':slug', this.props.routeParams.slug)}/${record[this.props.primaryKey]}`;

      return (
        <TableRow
          key={key}
          destination={destination}
          headers={this.props.headers}
          record={record}
          history={this.props.history}
          primaryKey={this.props.primaryKey}
          handleDelete={this.props.handleDelete}
        />
      );
    });

    return (
      <table className={`table ${styles.table}`}>
        <TableHeader
          headers={this.props.headers}
          changeSort={this.props.changeSort}
          sort={this.props.sort}
        />
        <tbody>
          {tableRows}
        </tbody>
      </table>
    );
  }
}

Table.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

Table.propTypes = {
  changeSort: React.PropTypes.func.isRequired,
  handleDelete: React.propTypes.func,
  headers: React.PropTypes.array.isRequired,
  history: React.PropTypes.object.isRequired,
  primaryKey: React.PropTypes.string.isRequired,
  records: React.PropTypes.array.isRequired,
  route: React.PropTypes.object.isRequired,
  routeParams: React.PropTypes.object.isRequired,
  sort: React.PropTypes.string.isRequired,
};

Table.defaultProps = {
  handleDelete: () => {},
};

export default Table;
