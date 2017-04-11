/**
 *
 * LimitSelect
 *
 */

import React from 'react';

import styles from './styles.scss';

class LimitSelect extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getOptionsValues() {
    return [{
      value: 10,
      label: 10,
    }, {
      value: 20,
      label: 20,
    }, {
      value: 50,
      label: 50,
    }, {
      value: 100,
      label: 100,
    }];
  }

  shouldComponentUpdate() {
    return false;
  }

  render() {
    const options = this.getOptionsValues().map((optionValue) => (
      <option value={optionValue.value} key={optionValue.value}>{optionValue.label}</option>
    ));

    return (
      <form className="form-inline">
        <div className="form-group">
          <label className={styles.label} for="sel1">Items per page:</label>
          <div className={styles.selectWrapper}>
            <select onChange={this.props.onLimitChange} className={`form-control ${styles.select}`} id="sel1">
              {options}
            </select>
          </div>
        </div>
      </form>
    );
  }
}

export default LimitSelect;
