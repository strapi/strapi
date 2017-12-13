/**
 *
 * SelectOne
 *
 */

import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import 'react-select/dist/react-select.css';
import { map, isArray, isNull, isUndefined, isFunction, get } from 'lodash';

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

  getOptions = (query) => {
    const params = {
      limit: 20,
      source: this.props.relation.plugin || 'content-manager',
    };

    // Set `query` parameter if necessary
    if (query) {
      params.query = query;
      params.queryAttribute = this.props.relation.displayedAttribute;
    }

    // Request URL
    const requestUrlSuffix = query && this.props.record.get(this.props.relation.alias) ? this.props.record.get(this.props.relation.alias) : '';
    const requestUrl = `/content-manager/explorer/${this.props.relation.model || this.props.relation.collection}/${requestUrlSuffix}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = isArray(response) ?
          map(response, item => ({
            value: item,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, item).mainField,
          })) :
          [{
            value: response,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, response).mainField,
          }];

        return {options};
      })
      .catch(() => {
        strapi.notification.error('content-manager.notification.relationship.fetch');
      });
  }

  handleChange = (value) => {
    this.props.setRecordAttribute(this.props.relation.alias, value);
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
          onChange={this.handleChange}
          loadOptions={this.getOptions}
          simpleValue
          value={isNull(value) || isUndefined(value) ? null : {
            value: isFunction(value.toJS) ? value.toJS() : value,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, isFunction(value.toJS) ? value.toJS() : value).mainField || (isFunction(value.toJS) ? get(value.toJS(), 'id') : get(value, 'id')),
          }}
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectOne.propTypes = {
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  relation: PropTypes.object.isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
};

export default SelectOne;
