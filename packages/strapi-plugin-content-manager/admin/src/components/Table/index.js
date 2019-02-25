/**
*
* Table
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { toString } from 'lodash';

import TableDelete from '../TableDelete';
import TableHeader from '../TableHeader';
import TableRow from '../TableRow';
import TableEmpty from '../TableEmpty';
import TableLoading from '../TableLoading';

import styles from './styles.scss';

class Table extends React.Component {
  render() {
    const rows = this.props.records.length === 0 ?
      (
        <TableEmpty
          filters={this.props.filters}
          colspan={this.props.enableBulkActions ? this.props.headers.length + 1 : this.props.headers.length}
          contentType={this.props.routeParams.slug}
          search={this.props.search}
        />
      ) :
      this.props.records.map((record, key) => (
        <TableRow
          enableBulkActions={this.props.enableBulkActions}
          onChange={this.props.onClickSelect}
          key={key}
          destination={`${this.props.route.path.replace(':slug', this.props.routeParams.slug)}/${record[this.props.primaryKey]}`}
          headers={this.props.headers}
          record={record}
          history={this.props.history}
          primaryKey={this.props.primaryKey}
          onDelete={this.props.handleDelete}
          redirectUrl={this.props.redirectUrl}
          value={this.props.entriesToDelete.indexOf(toString(record.id)) !== -1}
        />
      ));
    const entriesToDeleteNumber = this.props.entriesToDelete.length;

    return (
      <table className={`table ${styles.table}`}>
        <TableHeader
          enableBulkActions={this.props.enableBulkActions}
          onClickSelectAll={this.props.onClickSelectAll}
          value={this.props.deleteAllValue}
          headers={this.props.headers}
          onChangeSort={this.props.onChangeSort}
          sort={this.props.sort}
          primaryKey={this.props.primaryKey}
          entriesToDelete={this.props.entriesToDelete}
        />
        <tbody>
          { entriesToDeleteNumber > 0 && (
            <TableDelete
              colspan={this.props.headers.length + 1}
              number={entriesToDeleteNumber}
              onToggleDeleteAll={this.props.onToggleDeleteAll}
            />
          )}
          {this.props.showLoader ? <TableLoading colspan={this.props.headers.length + 1} /> : rows}
        </tbody>
      </table>
    );
  }
}

Table.contextTypes = {
  router: PropTypes.object.isRequired,
};

Table.defaultProps = {
  enableBulkActions: true,
  entriesToDelete: [],
  handleDelete: () => {},
  search: '',
  showLoader: false,
};

Table.propTypes = {
  deleteAllValue: PropTypes.bool.isRequired,
  enableBulkActions: PropTypes.bool,
  entriesToDelete: PropTypes.array,
  filters: PropTypes.array.isRequired,
  handleDelete: PropTypes.func,
  headers: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onClickSelect: PropTypes.func.isRequired,
  onClickSelectAll: PropTypes.func.isRequired,
  onToggleDeleteAll: PropTypes.func.isRequired,
  primaryKey: PropTypes.string.isRequired,
  records: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  redirectUrl: PropTypes.string.isRequired,
  route: PropTypes.object.isRequired,
  routeParams: PropTypes.object.isRequired,
  search: PropTypes.string,
  showLoader: PropTypes.bool,
  sort: PropTypes.string.isRequired,
};

export default Table;
