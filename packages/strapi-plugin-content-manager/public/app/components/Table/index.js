/**
*
* Table
*
*/

import React from 'react';

import TableHeader from 'components/TableHeader';
import TableRow from 'components/TableRow';

import styles from './styles.scss';

class Table extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const tableRows = this.props.records.map((record, key) => {
      const destination = this.props.route.path.replace(':slug', this.props.routeParams.slug) + '/' + record.id;

      return (
        <TableRow
          key={key}
          destination={destination}
          headers={this.props.headers}
          record={record}
          history={this.props.history}
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
  records: React.PropTypes.array,
  route: React.PropTypes.object,
  routeParams: React.PropTypes.object,
  headers: React.PropTypes.array,
  changeSort: React.PropTypes.func,
  sort: React.PropTypes.string,
  history: React.PropTypes.object,
};

export default Table;
