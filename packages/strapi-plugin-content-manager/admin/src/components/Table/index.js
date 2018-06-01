/**
*
* Table
*
*/

import React from 'react';
import PropTypes from 'prop-types';

import TableDelete from 'components/TableDelete';
import TableHeader from 'components/TableHeader';
import TableRow from 'components/TableRow';
import TableEmpty from 'components/TableEmpty';

import styles from './styles.scss';

class Table extends React.Component {
  render() {
    const rows = this.props.records.length === 0 ?
      (
        <TableEmpty
          filters={this.props.filters}
          colspan={this.props.headers.length + 1}
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
    const selectedEntriesNumber = this.props.selectedEntries.length;

    return (
      <table className={`table ${styles.table}`}>
        <TableHeader
          headers={this.props.headers}
          onChangeSort={this.props.onChangeSort}
          sort={this.props.sort}
          primaryKey={this.props.primaryKey}
        />
        <tbody>
          { selectedEntriesNumber > 1 && (
            <TableDelete
              colspan={this.props.headers.length + 1}
              number={selectedEntriesNumber}
            />
          )}
          {rows}
        </tbody>
      </table>
    );
  }
}

Table.contextTypes = {
  router: PropTypes.object.isRequired,
};

Table.defaultProps = {
  handleDelete: () => {},
  selectedEntries: [],
};

Table.propTypes = {
  filters: PropTypes.array.isRequired,
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
  selectedEntries: PropTypes.array,
  sort: PropTypes.string.isRequired,
};

export default Table;
