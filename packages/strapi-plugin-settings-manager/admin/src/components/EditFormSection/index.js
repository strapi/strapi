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
import styles from './styles.scss';

class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const sectionName = isEmpty(this.props.section.name) ? '' : <FormattedMessage {...{id: this.props.section.name}} />;

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
                this.props.renderInput(item, key)
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
};

export default WithFormSection(EditFormSection); // eslint-disable-line new-cap
