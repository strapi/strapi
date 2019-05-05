/**
 *
 * TableRow
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { withRouter } from 'react-router-dom';
import { isEmpty, isNull, isObject, toLower, toString } from 'lodash';
import cn from 'classnames';

import { IcoContainer } from 'strapi-helper-plugin';

import CustomInputCheckbox from '../CustomInputCheckbox';

import styles from './styles.scss';

class TableRow extends React.Component {
  constructor(props) {
    super(props);

    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * Return a formatted value according to the
   * data type and value stored in database
   *
   * @param type  {String} Data type
   * @param value {*}      Value stored in database
   * @returns {*}
   */
  getDisplayedValue(type, value, name) {
    switch (toLower(type)) {
      case 'string':
      case 'text':
      case 'email':
      case 'enumeration':
        return (value && !isEmpty(toString(value))) || name === 'id'
          ? toString(value)
          : '-';
      case 'float':
      case 'integer':
      case 'biginteger':
      case 'decimal':
        return !isNull(value) ? toString(value) : '-';
      case 'boolean':
        return value !== null ? toString(value) : '-';
      case 'date':
      case 'time':
      case 'datetime':
      case 'timestamp': {
        if (value === null) {
          return '-';
        }

        const date =
          value && isObject(value) && value._isAMomentObject === true
            ? value
            : moment.utc(value);

        return date.format('YYYY-MM-DD HH:mm:ss');
      }
      case 'password':
        return '••••••••';
      default:
        return '-';
    }
  }

  // Redirect to the edit page
  handleClick() {
    this.context.emitEvent('willEditEntry');
    this.props.history.push(
      `${this.props.destination}${this.props.redirectUrl}`,
    );
  }

  renderAction = () => (
    <td key="action" className={styles.actions}>
      <IcoContainer
        icons={[
          { icoType: 'pencil', onClick: this.handleClick },
          {
            id: this.props.record.id,
            icoType: 'trash',
            onClick: this.props.onDelete,
          },
        ]}
      />
    </td>
  );

  renderCells = () => {
    const { headers } = this.props;
    return [this.renderDelete()]
      .concat(
        headers.map((header, i) => (
          <td key={i}>
            <div className={styles.truncate}>
              <div className={styles.truncated}>
                {this.getDisplayedValue(
                  header.type,
                  this.props.record[header.name],
                  header.name,
                )}
              </div>
            </div>
          </td>
        )),
      )
      .concat([this.renderAction()]);
  };

  renderDelete = () => {
    if (this.props.enableBulkActions) {
      return (
        <td onClick={e => e.stopPropagation()} key="i">
          <CustomInputCheckbox
            name={this.props.record.id}
            onChange={this.props.onChange}
            value={this.props.value}
          />
        </td>
      );
    }

    return null;
  };

  render() {
    return (
      <tr
        className={cn(
          styles.tableRow,
          this.props.enableBulkActions && styles.tableRowWithBulk,
        )}
        onClick={this.handleClick}
      >
        {this.renderCells()}
      </tr>
    );
  }
}

TableRow.contextTypes = {
  emitEvent: PropTypes.func,
};

TableRow.propTypes = {
  destination: PropTypes.string.isRequired,
  enableBulkActions: PropTypes.bool,
  headers: PropTypes.array.isRequired,
  history: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func,
  record: PropTypes.object.isRequired,
  redirectUrl: PropTypes.string.isRequired,
  value: PropTypes.bool,
};

TableRow.defaultProps = {
  enableBulkActions: true,
  onDelete: () => {},
  value: false,
};

export default withRouter(TableRow);
