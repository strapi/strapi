/**
 *
 * SelectMany
 *
 */

import React from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import 'react-select/dist/react-select.css';
import { isArray, isNull, isUndefined, get, findIndex } from 'lodash';

import request from 'utils/request';
import templateObject from 'utils/templateObject';

import styles from './styles.scss';

class SelectMany extends React.Component { // eslint-disable-line react/prefer-stateless-function
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
    // NOTE: keep this line if we rollback to the old container
    // const requestUrlSuffix = query && this.props.record.get(this.props.relation.alias).toJS() ? this.props.record.get(this.props.relation.alias).toJS() : '';
    const requestUrl = `/content-manager/explorer/${this.props.relation.model || this.props.relation.collection}/${requestUrlSuffix}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = isArray(response) ?
          response.map(item => ({
            value: item,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, item).mainField,
          })) :
          [{
            value: response,
            label: response[this.props.relation.displayedAttribute],
          }];

        return { options };
      })
      .catch(() => {
        strapi.notification.error('content-manager.notification.error.relationship.fetch');
      });
  }

  handleChange = (value) => {
    const filteredValue = value.filter((data, index  ) => findIndex(value, (o) => o.value.id === data.value.id) === index);
    const target = {
      name: `record.${this.props.relation.alias}`,
      type: 'select',
      value: filteredValue,
    };

    this.props.setRecordAttribute({ target });
    // NOTE: keep this line if we rollback to the old container
    // this.props.setRecordAttribute(this.props.relation.alias, filteredValue);
  }

  render() {
    const description = this.props.relation.description
      ? <p>{this.props.relation.description}</p>
      : '';

    const value = get(this.props.record, this.props.relation.alias);
    // NOTE: keep this line if we rollback to the old container
    // const value = this.props.record.get(this.props.relation.alias);

    /* eslint-disable jsx-a11y/label-has-for */
    return (
      <div className={`form-group ${styles.selectMany}`}>
        <label htmlFor={this.props.relation.alias}>{this.props.relation.alias}</label>
        {description}
        <Select.Async
          onChange={this.handleChange}
          loadOptions={this.getOptions}
          id={this.props.relation.alias}
          multi
          value={isNull(value) || isUndefined(value) || value.size === 0 ? null : value.map(item => {
            if (item) {
              return {
                value: get(item, 'value') || item,
                label: get(item, 'label') || templateObject({ mainField: this.props.relation.displayedAttribute }, item).mainField || item.value.id,
              };
            }
          })}
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectMany.propTypes = {
  record: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]).isRequired,
  relation: PropTypes.object.isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
};

export default SelectMany;
