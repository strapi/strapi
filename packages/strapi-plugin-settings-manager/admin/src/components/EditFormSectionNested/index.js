/**
*
* EditFormSectionNested
*
*/

import React from 'react';
import { map } from 'lodash';

// HOC
import WithFormSection from 'components/WithFormSection';

class EditFormSectionNested extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={this.props.styles.padded}>
        <div className="row">
          {map(this.props.section, (item, key) => (
            this.props.renderInput(item, key)
          ))}
        </div>
      </div>
    );
  }
}

EditFormSectionNested.propTypes = {
  renderInput: React.PropTypes.func,
  section: React.PropTypes.oneOfType([
    React.PropTypes.array,
    React.PropTypes.object,
  ]),
  styles: React.PropTypes.object,
};

export default WithFormSection(EditFormSectionNested); // eslint-disable-line new-cap
