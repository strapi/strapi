/**
 *
 * TableHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class TableHeader extends React.Component {
  changeSort(name) {
    if (this.props.sort === name) {
      this.props.changeSort(`-${name}`);
    } else if (this.props.sort === `-${name}`) {
      this.props.changeSort(this.props.primaryKey);
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
        icon = <i className={`fa fa-sort-asc ${styles.iconAsc}`} />;
      } else if (this.props.sort === `-${header.name}`) {
        icon = <i className={`fa fa-sort-asc ${styles.iconDesc}`} />;
      }

      return (
        <th // eslint-disable-line jsx-a11y/no-static-element-interactions
          key={i}
          onClick={() => this.changeSort(header.name)}
        >
          <span>
            {header.label}
            {icon}
          </span>

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
  changeSort: PropTypes.func.isRequired,
  headers: PropTypes.array.isRequired,
  primaryKey: PropTypes.string.isRequired,
  sort: PropTypes.string.isRequired,
};

export default TableHeader;
