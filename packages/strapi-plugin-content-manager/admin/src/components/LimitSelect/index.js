/**
 *
 * LimitSelect
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { map } from 'lodash';
import styles from './styles.scss';

class LimitSelect extends React.Component {
  componentWillMount() {
    const id = _.uniqueId();
    this.setState({ id });
  }

  /**
   * Return the list of default values to populate the select options
   *
   * @returns {number[]}
   */
  getOptionsValues() {
    return [10, 20, 50, 100];
  }

  render() {
    return (
      <form className="form-inline">

        <div className={styles.selectWrapper}>
          <select
            onChange={this.props.onChangeLimit}
            className={`form-control ${styles.select}`}
            id={this.state.id}
            value={this.props.limit}
          >
            {map(this.getOptionsValues(), (optionValue, key) => <option value={optionValue} key={key}>{optionValue}</option>)}
          </select>
        </div>
        <label className={styles.label} htmlFor={this.state.id}>
          <FormattedMessage id="content-manager.components.LimitSelect.itemsPerPage" />
        </label>
      </form>
    );
  }
}

LimitSelect.propTypes = {
  limit: PropTypes.number.isRequired,
  onChangeLimit: PropTypes.func.isRequired,
};

export default LimitSelect;
