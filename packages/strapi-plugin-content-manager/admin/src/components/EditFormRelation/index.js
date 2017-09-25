/**
 *
 * EditFormRelation
 *
 */

import React from 'react';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import _ from 'lodash';

import request from 'utils/request';

class EditFormRelation extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.getOptions = this.getOptions.bind(this);
    this.state = {
      isLoading: true,
    };
  }

  onChange(value) {
    this.props.setRecordAttribute(this.props.relation.attribute, value);
  }

  getOptions(query) {
    // Init `params` object
    const params = {};

    // Set results limit
    params.limit = 20;

    // Set `query` parameter if necessary
    if (query) {
      params.query = query;
      params.queryAttribute = this.props.relation.displayedAttribute;
    }

    // Request URL
    const requestUrlSuffix = query && this.props.record.get(this.props.relation.attribute) ? this.props.record.get(this.props.relation.attribute) : '';
    const requestUrl = `/content-manager/explorer/${this.props.relation.model}/${requestUrlSuffix}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = _.isArray(response)
          ? _.map(response, item => ({
            value: item.id,
            label: item[this.props.relation.displayedAttribute],
          }))
          : [{
            value: response.id,
            label: response[this.props.relation.displayedAttribute],
          }];

        return {options};
      });
  }

  render() {
    const description = this.props.relation.description
      ? <p>{this.props.relation.description}</p>
      : '';

    return (
      <div className="form-group">
        <label // eslint-disable-line jsx-a11y/label-has-for
          htmlFor={this.props.relation.label}
        >
          {this.props.relation.label}
        </label>
        {description}
        <Select.Async
          onChange={this.onChange}
          loadOptions={this.getOptions}
          simpleValue
          value={this.props.record.get(this.props.relation.attribute)}
        />
      </div>
    );
  }
}

EditFormRelation.propTypes = {
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  relation: React.PropTypes.object.isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
};

export default EditFormRelation;
