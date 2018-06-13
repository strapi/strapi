/**
 *
 * TableHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import CustomInputCheckbox from 'components/CustomInputCheckbox';

import styles from './styles.scss';

class TableHeader extends React.Component {
  handleChangeSort(name) {
    if (this.props.sort === name) {
      this.props.onChangeSort(`-${name}`);
    } else if (this.props.sort === `-${name}`) {
      this.props.onChangeSort(this.props.primaryKey);
    } else {
      this.props.onChangeSort(name);
    }
  }

  renderBulk = () => (
    <th key="bulk_action">
      <CustomInputCheckbox
        entriesToDelete={this.props.entriesToDelete}
        isAll
        name="all"
        onChange={this.props.onClickSelectAll}
        value={this.props.value}
      />
    </th>
  );

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
          onClick={() => this.handleChangeSort(header.name)}
        >
          <span>
            {header.label}
            {icon}
          </span>

        </th>
      );
    });

    // Add empty th for actions column.
    headers.push(<th key="th_action"></th>);

    return (
      <thead className={styles.tableHeader}>
        <tr >
          {[this.renderBulk()].concat(headers)}
        </tr>
      </thead>
    );
  }
}

TableHeader.defaultProps = {
  value: false,
};

TableHeader.propTypes = {
  entriesToDelete: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onClickSelectAll: PropTypes.func.isRequired,
  primaryKey: PropTypes.string.isRequired,
  sort: PropTypes.string.isRequired,
  value: PropTypes.bool,
};

export default TableHeader;
