/**
 *
 * LimitSelect
 *
 */

import React from 'react';
import _ from 'lodash';

class LimitSelect extends React.Component {
  componentWillMount() {
    const id = _.uniqueId();
    this.setState({ id });
  }

  shouldComponentUpdate() {
    return false;
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
    return <div />;

    // // Generate options
    // const options = this.getOptionsValues().map(optionValue => (
    //   <option value={optionValue} key={optionValue}>{optionValue}</option>
    // ));
    //
    // // Get id in order to link the `label` and the `select` elements
    // const id = this.state.id;
    //
    // return (
    //   <form className="form-inline">
    //     <div className="form-group">
    //       <label className={styles.label} htmlFor={id}>
    //         <FormattedMessage id="content-manager.components.LimitSelect.itemsPerPage" />:
    //       </label>
    //       <div className={styles.selectWrapper}>
    //         <select
    //           onChange={this.props.onLimitChange}
    //           className={`form-control ${styles.select}`}
    //           id={id}
    //         >
    //           {options}
    //         </select>
    //       </div>
    //     </div>
    //   </form>
    // );
  }
}

LimitSelect.propTypes = {
  // onLimitChange: React.PropTypes.func.isRequired,
};

export default LimitSelect;
