/**
 *
 * TableHeader
 *
 */

import React from 'react';

import { FormattedMessage } from 'react-intl';
import messages from './messages';
import styles from './styles.scss';

class TableHeader extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const headers = this.props.headers.map((header, i) => {
      return <th key={i}>{header.label}</th>
    });

    return (
      <thead className={styles.tableHeader}>
      <tr className={styles.tableHeader}>
        <th>ID</th>
        {headers}
        <th></th>
      </tr>
      </thead>
    );
  }
}

export default TableHeader;
