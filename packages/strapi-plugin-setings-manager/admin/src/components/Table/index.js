/**
*
* Table
*
*/

import React from 'react';

import styles from './styles.scss';

class Table extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    console.log(this.props)
    return (
      <div className={styles.table}>
      </div>
    );
  }
}

Table.PropTypes = {
  tableHead: React.PropTypes.array.isRequired,
}

export default Table;
