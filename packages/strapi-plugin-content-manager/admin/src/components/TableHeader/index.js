/**
 *
 * TableHeader
 *
 */

import React from 'react';

import styles from './styles.scss';

class TableHeader extends React.Component {
  changeSort(name) {
    if (this.props.sort === name) {
      this.props.changeSort(`-${name}`);
    } else if (this.props.sort === `-${name}`) {
      this.props.changeSort('id');
    } else {
      this.props.changeSort(name);
    }
  }

  render() {
    // Generate headers list
    const headers = this.props.headers.map((header, i) => {
      // Define sort icon
      let icon;
      if (this.props.sort === header.name) {
        icon = <i className={`ion ion-arrow-up-b ${styles.icon}`} />;
      } else if (this.props.sort === `-${header.name}`) {
        icon = <i className={`ion ion-arrow-down-b ${styles.icon}`} />;
      }

      return (
        <th // eslint-disable-line jsx-a11y/no-static-element-interactions
          key={i}
          onClick={() => this.changeSort(header.name)}
        >
          {header.label} {icon}
        </th>
      );
    });

    // Add empty th for actions column.
    headers.push(<th key={`th_action`}></th>);

    return (
      <thead className={styles.tableHeader}>
        <tr >
          {headers}
        </tr>
      </thead>
    );
  }
}

TableHeader.propTypes = {
  changeSort: React.PropTypes.func.isRequired,
  headers: React.PropTypes.array.isRequired,
  sort: React.PropTypes.string.isRequired,
};

export default TableHeader;
