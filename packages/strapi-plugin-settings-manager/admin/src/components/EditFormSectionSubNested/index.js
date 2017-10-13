/**
*
* EditFormSectionSubNested
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map } from 'lodash';
import WithFormSection from 'components/WithFormSection';

/* eslint-disable react/require-default-props  */
class EditFormSectionSubNested extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={`${this.props.styles.padded} ${this.props.styles.subNestedFormContainer}`}>
        <div className="row">
          {map(this.props.section, (item, key) => (
            this.props.renderInput(item, key)
          ))}
        </div>
      </div>
    );
  }
}

EditFormSectionSubNested.propTypes = {
  renderInput: PropTypes.func,
  section: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]),
  styles: PropTypes.object,
};

export default WithFormSection(EditFormSectionSubNested); // eslint-disable-line new-cap
