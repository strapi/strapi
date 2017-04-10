/**
*
* Table
*
*/

import React from 'react';

import TableHeader from 'components/TableHeader';
import TableRow from 'components/TableRow';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
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
        />
      );
    });

    return (
      <table className={`table ${styles.table}`}>
        <TableHeader
          headers={this.props.headers}
        />
        <tbody>
        {tableRows}
        </tbody>
      </table>
    );
  }
}

Table.propTypes = {
  records: React.PropTypes.array,
  route: React.PropTypes.object,
  routeParams: React.PropTypes.object,
  headers: React.PropTypes.array,
};

export default Table;
