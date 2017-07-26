/**
*
* EditFormSection
*
*/

import React from 'react';
import { map, isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
// HOC Form
import WithFormSection from 'components/WithFormSection';

class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const sectionName = isEmpty(this.props.section.name) ? '' : <FormattedMessage {...{id: this.props.section.name}} />;
  // get the styles from the WithFormSection HOC
    const styles = this.props.styles;
    return (
      <div className={styles.editFormSection}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <span className={styles.sectionHeader}>
                {sectionName}
              </span>
            </div>
            <form>
              {map(this.props.section.items, (item, key) => (
                this.props.renderInput(this.props.section.items, item, key)
              ))}
            </form>
          </div>
        </div>
      </div>
    );
  }
}

EditFormSection.propTypes = {
  renderInput: React.PropTypes.func,
  section: React.PropTypes.object,
  styles: React.PropTypes.object,
};

export default WithFormSection(EditFormSection); // eslint-disable-line new-cap
