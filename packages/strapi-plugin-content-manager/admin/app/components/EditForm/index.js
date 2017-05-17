/**
 *
 * EditForm
 *
 */

import React from 'react';
import _ from 'lodash';

class EditForm extends React.Component {
  constructor(props) {
    super(props);
    this.onFormSubmit = this.onFormSubmit.bind(this);
  }

  onFormSubmit(e) {
    e.preventDefault();
    this.props.editRecord();
  }

  generateField(attributeValue, attributeKey) {
    let input;

    // Generate fields according to attribute type
    switch (attributeValue.type) {
      case 'boolean':
        input = (
          <select
            className="form-control"
            onChange={e =>
              this.props.setRecordAttribute(
                attributeKey,
                e.target.value === 'true'
              )}
            defaultValue={
              this.props.record && this.props.record.get(attributeKey)
            }
          >
            <option disabled>Select an option</option>
            <option value>True</option>
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
            value={
              (this.props.record && this.props.record.get(attributeKey)) || ''
            }
            onChange={e =>
              this.props.setRecordAttribute(attributeKey, e.target.value)}
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
            value={
              (this.props.record && this.props.record.get(attributeKey)) || ''
            }
            onChange={e =>
              this.props.setRecordAttribute(attributeKey, e.target.value)}
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
            value={
              (this.props.record && this.props.record.get(attributeKey)) || ''
            }
            onChange={e =>
              this.props.setRecordAttribute(attributeKey, e.target.value)}
          />
        );
    }

    return (
      <div key={attributeKey} className="form-group">
        <label htmlFor={attributeKey}>{attributeKey}</label>
        {input}
      </div>
    );
  }

  render() {
    const fields = _.map(
      this.props.currentModel.attributes,
      (attributeValue, attributeKey) =>
        this.generateField(attributeValue, attributeKey)
    );

    return (
      <div>
        <form onSubmit={this.onFormSubmit}>
          {fields}
          <input type="submit" className="hidden-xs-up" />
        </form>
      </div>
    );
  }
}

EditForm.propTypes = {
  currentModel: React.PropTypes.object.isRequired,
  editRecord: React.PropTypes.func.isRequired,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  setRecordAttribute: React.PropTypes.func.isRequired,
};

export default EditForm;
