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
    // Generate options
    const options = this.getOptionsValues().map((optionValue) => (
      <option value={optionValue.value} key={optionValue.value}>{optionValue.label}</option>
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

export default LimitSelect;
