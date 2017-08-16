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
// nested form
import EditFormSectionNested from 'components/EditFormSectionNested';

class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const sectionName = isEmpty(this.props.section.name) ? '' : <FormattedMessage {...{id: this.props.section.name}} />;

    return (
      <div className={this.props.styles.editFormSection}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <span className={this.props.styles.sectionHeader}>
                {sectionName}
              </span>
            </div>
            {map(this.props.section.items, (item, key) => {

              if (this.props.showNestedForm) {
                return (
                  <div key={key} style={{width: '100%'}}>
                    {this.props.renderInput(item, key)}
                    <EditFormSectionNested
                      section={item.items}
                      values={this.props.values}
                      handleChange={this.props.handleChange}
                    />
                  </div>
                )
              }
              return this.props.renderInput(item, key);
            })}
          </div>
        </div>
      </div>
    );
  }
}

EditFormSection.propTypes = {
  handleChange: React.PropTypes.func,
  renderInput: React.PropTypes.func,
  section: React.PropTypes.object,
  showNestedForm: React.PropTypes.bool,
  styles: React.PropTypes.object,
  values: React.PropTypes.object,
};

export default WithFormSection(EditFormSection); // eslint-disable-line new-cap
