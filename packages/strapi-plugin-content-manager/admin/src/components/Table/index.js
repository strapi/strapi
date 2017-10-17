/**
*
* Table
*
*/

import React from 'react';
import PropTypes from 'prop-types';

import TableHeader from '../TableHeader';
import TableRow from '../TableRow';
import TableEmpty from '../TableEmpty';

import styles from './styles.scss';

class Table extends React.Component {
  render() {
    const rows = this.props.records.length === 0 ?
      (
        <TableEmpty
          colspan={this.props.headers.length}
          contentType={this.props.routeParams.slug}
        />
      ) :
      this.props.records.map((record, key) => (
        <TableRow
          key={key}
          destination={`${this.props.route.path.replace(':slug', this.props.routeParams.slug)}/${record[this.props.primaryKey]}`}
          headers={this.props.headers}
          record={record}
          history={this.props.history}
          primaryKey={this.props.primaryKey}
          onDelete={this.props.handleDelete}
          redirectUrl={this.props.redirectUrl}
        />
      ));

    return (
      <table className={`table ${styles.table}`}>
        <TableHeader
          headers={this.props.headers}
          onChangeSort={this.props.onChangeSort}
          sort={this.props.sort}
          primaryKey={this.props.primaryKey}
        />
        <tbody>
          {rows}
        </tbody>
      </table>
    );
  }
}

Table.contextTypes = {
  router: PropTypes.object.isRequired,
};

Table.propTypes = {
  handleDelete: PropTypes.func,
  headers: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  primaryKey: PropTypes.string.isRequired,
  records: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  redirectUrl: PropTypes.string.isRequired,
  route: PropTypes.object.isRequired,
  routeParams: PropTypes.object.isRequired,
  sort: PropTypes.string.isRequired,
};

Table.defaultProps = {
  handleDelete: () => {},
};

export default Table;
