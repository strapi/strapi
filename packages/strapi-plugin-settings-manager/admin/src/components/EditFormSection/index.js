/**
*
* EditFormSection
*
*/

import React from 'react';
import PropTypes from 'prop-types';
import { map, isEmpty } from 'lodash';
import { FormattedMessage } from 'react-intl';
// HOC Form
import WithFormSection from '../WithFormSection';
// nested form
import EditFormSectionNested from '../EditFormSectionNested';

/* eslint-disable react/require-default-props  */
class EditFormSection extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    const sectionName = isEmpty(this.props.section.name) ? '' : <FormattedMessage id={`settings-manager.${this.props.section.name}`} />;
    const spacer = !isEmpty(sectionName) ? <div className={this.props.styles.spacer} /> : '';
    const sectionNameSpacer = !sectionName ? <div style={{height: '.2rem'}} /> : '';
    const sectionDescription = this.props.section.description ? <div className={this.props.styles.sectionDescription}>{this.props.section.description}</div> : '';
    return (
      <div className={this.props.styles.editFormSection}>
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-12">
              <span className={this.props.styles.sectionHeader}>
                {sectionName}
              </span>
              {sectionDescription}
              {spacer}
              {sectionNameSpacer}
            </div>
            {map(this.props.section.items, (item, key) => {

              if (this.props.showNestedForm) {
                return (
                  <div key={key} style={{width: '100%'}}>
                    {this.props.renderInput(item, key)}
                    <EditFormSectionNested
                      section={item.items}
                      values={this.props.values}
                      onChange={this.props.onChange}
                      sectionNested
                      formErrors={this.props.formErrors}
                    />
                  </div>
                );
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
  formErrors: PropTypes.array,
  onChange: PropTypes.func,
  renderInput: PropTypes.func,
  section: PropTypes.object,
  showNestedForm: PropTypes.bool,
  styles: PropTypes.object,
  values: PropTypes.object,
};

export default WithFormSection(EditFormSection); // eslint-disable-line new-cap
