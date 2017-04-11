/**
 *
 * LimitSelect
 *
 */

import React from 'react';
import _ from 'lodash';

import styles from './styles.scss';

class LimitSelect extends React.Component { // eslint-disable-line react/prefer-stateless-function
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

  shouldComponentUpdate() {
    return false;
  }

  render() {
    // Generate options
    const options = this.getOptionsValues().map((optionValue) => (
      <option value={optionValue} key={optionValue}>{optionValue}</option>
    ));

    // Get id in order to link the `label` and the `select` elements
    const id = this.state.id;

    return (
      <form className="form-inline">
        <div className="form-group">
          <label className={styles.label} htmlFor={id}>Items per page:</label>
          <div className={styles.selectWrapper}>
            <select onChange={this.props.onLimitChange} className={`form-control ${styles.select}`} id={id}>
              {options}
            </select>
          </div>
        </div>
      </form>
    );
  }
}

LimitSelect.propTypes = {
  limit: React.PropTypes.number,
  onLimitChange: React.PropTypes.func,
};

export default LimitSelect;
