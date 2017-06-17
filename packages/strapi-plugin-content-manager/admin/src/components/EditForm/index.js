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
    const value = this.props.record && this.props.record.get(attributeKey);

    // Generate fields according to attribute type
    switch (attributeValue.type) {
      case 'boolean':
        input = (
          <select
            className="form-control"
            onChange={e =>
              this.props.setRecordAttribute(
                attributeKey,
                e.target.value === 'null'
                  ? null
                  : e.target.value === 'true'
              )}
          >
            <option value={'null'} selected={value !== true && value !== false}>Select an option</option>
            <option value selected={value === true}>True</option>
            <option value={false} selected={value === false}>False</option>
          </select>
        );
        break;
      case 'integer':
        input = (
          <input
            type="number"
            className="form-control"
            id={attributeKey}
            placeholder={attributeValue.placeholder || attributeValue.label || attributeKey}
            value={value}
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
            placeholder={attributeValue.placeholder || attributeValue.label || attributeKey}
            value={value}
            onChange={e =>
              this.props.setRecordAttribute(attributeKey, e.target.value)}
          />
        );
        break;
      case 'url':
        input = (
          <input
            type="url"
            className="form-control"
            id={attributeKey}
            placeholder={attributeValue.placeholder || attributeValue.label || attributeKey}
            value={value}
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
            placeholder={attributeValue.placeholder || attributeValue.label || attributeKey}
            value={value}
            onChange={e =>
              this.props.setRecordAttribute(attributeKey, e.target.value)}
          />
        );
    }

    const description = attributeValue.description
      ? <p>{attributeValue.description}</p>
      : '';

    return (
      <div key={attributeKey} className="form-group">
        <label htmlFor={attributeKey}>{attributeValue.label || attributeKey}</label>
        {description}
        {input}
      </div>
    );
  }

  render() {
    const fields = _.map(
      this.props.schema[this.props.currentModelName].fields,
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
  currentModelName: React.PropTypes.string.isRequired,
  editRecord: React.PropTypes.func.isRequired,
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]),
  schema: React.PropTypes.object.isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
};

export default EditForm;
