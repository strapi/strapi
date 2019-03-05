/**
 *
 * TableHeader
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import CustomInputCheckbox from '../CustomInputCheckbox';

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

  renderBulk = () => {
    if (this.props.enableBulkActions) {
      return (
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
    }

    return null;
  }

  render() {
    // Generate headers list
    const headers = this.props.headers.map((header, i) => {
      // Define sort icon
      let icon;

      if (this.props.sort === header.name || this.props.sort === 'id' && header.name === '_id') {
        icon = <i className={`fa fa-sort-asc ${styles.iconAsc}`} />;
      } else if (this.props.sort === `-${header.name}`) {
        icon = <i className={`fa fa-sort-asc ${styles.iconDesc}`} />;
      }

      return (
        <th // eslint-disable-line jsx-a11y/no-static-element-interactions
          key={i}
          onClick={() => {
            if (header.sortable) {
              this.handleChangeSort(header.name);
            }
          }}
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
      <thead className={cn(styles.tableHeader, this.props.enableBulkActions && styles.withBulk)}>
        <tr >
          {[this.renderBulk()].concat(headers)}
        </tr>
      </thead>
    );
  }
}

TableHeader.defaultProps = {
  enableBulkActions: true,
  value: false,
};

TableHeader.propTypes = {
  enableBulkActions: PropTypes.bool,
  entriesToDelete: PropTypes.array.isRequired,
  headers: PropTypes.array.isRequired,
  onChangeSort: PropTypes.func.isRequired,
  onClickSelectAll: PropTypes.func.isRequired,
  primaryKey: PropTypes.string.isRequired,
  sort: PropTypes.string.isRequired,
  value: PropTypes.bool,
};

export default TableHeader;
