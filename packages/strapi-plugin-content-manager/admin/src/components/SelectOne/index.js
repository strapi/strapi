/**
 *
 * SelectOne
 *
 */

import React from 'react';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { map, isArray, isNull, isUndefined } from 'lodash';

import request from 'utils/request';
import templateObject from 'utils/templateObject';

import styles from './styles.scss';

class SelectOne extends React.Component { // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
    };
  }

  onChange = (value) => {
    this.props.setRecordAttribute(this.props.relation.alias, value);
  }

  getOptions = (query) => {
    const params = {
      limit: 20,
    };

    // Set `query` parameter if necessary
    if (query) {
      params.query = query;
      params.queryAttribute = this.props.relation.displayedAttribute;
    }

    // Request URL
    const requestUrlSuffix = query && this.props.record.get(this.props.relation.alias) ? this.props.record.get(this.props.relation.alias) : '';
    const requestUrl = `/content-manager/explorer/${this.props.relation.model}/${requestUrlSuffix}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = isArray(response) ?
          map(response, item => ({
            value: item,
            label: item[this.props.relation.displayedAttribute],
          })) :
          [{
            value: response,
            label: response[this.props.relation.displayedAttribute],
          }];

        return {options};
      });
  }

  render() {
    const description = this.props.relation.description
      ? <p>{this.props.relation.description}</p>
      : '';

    const value = this.props.record.get(this.props.relation.alias);

    /* eslint-disable jsx-a11y/label-has-for */
    return (
      <div className={`form-group ${styles.selectOne}`}>
        <label htmlFor={this.props.relation.alias}>{this.props.relation.alias}</label>
        {description}
        <Select.Async
          onChange={this.onChange}
          loadOptions={this.getOptions}
          simpleValue
          value={isNull(value) || isUndefined(value) ? null : {
            value: value.toJS().id,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, value.toJS()).mainField,
          }}
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectOne.propTypes = {
  record: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.bool,
  ]).isRequired,
  relation: React.PropTypes.object.isRequired,
  setRecordAttribute: React.PropTypes.func.isRequired,
};

export default SelectOne;
