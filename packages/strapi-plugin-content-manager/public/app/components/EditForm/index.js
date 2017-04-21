/**
 *
 * EditForm
 *
 */

import React from 'react';
import _ from 'lodash';

class EditForm extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.onFormSubmit = this.onFormSubmit.bind(this);
  }

  onFormSubmit(e) {
    e.preventDefault();
    this.props.editRecord();
  }

  render() {
    const fields = _.map(this.props.currentModel.attributes, (attributeValue, attributeKey) => {
      let input;

      // TMP - Skip attribute without `type` attribute.
      // Relations are not supported yet.
      if (!attributeValue.type) {
        return;
      }

      // Generate fields according to attribute type
      switch (attributeValue.type) {
        case 'boolean':
          input = (
            <select
              className="form-control"
              onChange={(e) => this.props.setRecordAttribute(attributeKey, e.target.value === 'true' ? true : false)}
              defaultValue={this.props.record && this.props.record.get(attributeKey)}
            >
              <option disabled>Select an option</option>
              <option value={true}>True</option>
              <option value={false}>False</option>
            </select>
          );
          break;
        case 'integer':
          input = (
            <input
              type="number"
              className="form-control"
              id={attributeKey}
              placeholder={attributeKey}
              value={this.props.record && this.props.record.get(attributeKey) || ''}
              onChange={(e) => this.props.setRecordAttribute(attributeKey, e.target.value)}
            />
          );
          break;
        case 'string':
          input = (
            <input
              type="text"
              className="form-control"
              id={attributeKey}
              placeholder={attributeKey}
              value={this.props.record && this.props.record.get(attributeKey) || ''}
              onChange={(e) => this.props.setRecordAttribute(attributeKey, e.target.value)}
            />
          );
          break;
        default:
          input = (
            <input
              type="text"
              className="form-control"
              id={attributeKey}
              placeholder={attributeKey}
              value={this.props.record && this.props.record.get(attributeKey) || ''}
              onChange={(e) => this.props.setRecordAttribute(attributeKey, e.target.value)}
            />
          );
      }

      return (
        <div key={attributeKey} className="form-group">
          <label htmlFor={attributeKey}>{attributeKey}</label>
          {input}
        </div>
      );
    });

    return (
      <div>
        <form onSubmit={this.onFormSubmit}>
          {fields}
          <input type="submit" className="hidden-xs-up"/>
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {};

export default EditForm;
