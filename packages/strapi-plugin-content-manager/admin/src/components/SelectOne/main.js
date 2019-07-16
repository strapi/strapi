/**
 *
 * SelectOne
 *
 */

import React from 'react';
import Select from 'react-select';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';

import {
  cloneDeep,
  map,
  includes,
  isArray,
  isNull,
  isUndefined,
  isFunction,
  get,
  findIndex,
} from 'lodash';

import { request, templateObject } from 'strapi-helper-plugin';

import styles from './styles.scss';

class SelectOne extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      options: [],
      toSkip: 0,
    };
  }

  componentDidMount() {
    this.getOptions('');
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.toSkip !== this.state.toSkip) {
      this.getOptions('');
    }
  }

  getOptions = query => {
    const params = {
      _limit: 20,
      _start: this.state.toSkip,
      source: this.props.relation.plugin || 'content-manager',
    };

    // Set `query` parameter if necessary
    if (query) {
      delete params._limit;
      delete params._start;
      params[`${this.props.relation.displayedAttribute}_contains`] = query;
    }

    // Request URL
    const requestUrlSuffix =
      query && get(this.props.record, [this.props.relation.alias])
        ? get(this.props.record, [this.props.relation.alias])
        : '';
    const requestUrl = `/content-manager/explorer/${this.props.relation.model ||
      this.props.relation.collection}/${requestUrlSuffix}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = isArray(response)
          ? map(response, item => ({
            value: item,
            label: templateObject(
              { mainField: this.props.relation.displayedAttribute },
              item,
            ).mainField,
          }))
          : [
            {
              value: response,
              label: templateObject(
                { mainField: this.props.relation.displayedAttribute },
                response,
              ).mainField,
            },
          ];

        const newOptions = cloneDeep(this.state.options);
        options.map(option => {
          // Don't add the values when searching
          if (
            findIndex(newOptions, o => o.value.id === option.value.id) === -1
          ) {
            return newOptions.push(option);
          }
        });

        return this.setState({
          options: newOptions,
          isLoading: false,
        });
      })
      .catch(() => {
        strapi.notification.error(
          'content-manager.notification.error.relationship.fetch',
        );
      });
  };

  handleChange = value => {
    const target = {
      name: `record.${this.props.relation.alias}`,
      value,
      type: 'select',
    };

    this.props.setRecordAttribute({ target });
  };

  handleBottomScroll = () => {
    this.setState(prevState => {
      return {
        toSkip: prevState.toSkip + 1,
      };
    });
  };

  // Redirect to the edit page
  handleClick = (item = {}) => {
    this.props.onRedirect({
      model: this.props.relation.collection || this.props.relation.model,
      id: item.value.id || item.value._id,
      source: this.props.relation.plugin,
    });
  };

  handleInputChange = value => {
    const clonedOptions = this.state.options;
    const filteredValues = clonedOptions.filter(data =>
      includes(data.label, value),
    );

    if (filteredValues.length === 0) {
      return this.getOptions(value);
    }
  };

  render() {
    const description = this.props.relation.description ? (
      <p>{this.props.relation.description}</p>
    ) : (
      ''
    );

    const value = get(this.props.record, this.props.relation.alias);
    const excludeModel = ['role', 'permission', 'file'].includes(
      this.props.relation.model || this.props.relation.collection,
    ); // Temporary.
    const entryLink =
      isNull(value) || isUndefined(value) || excludeModel ? (
        ''
      ) : (
        <FormattedMessage id="content-manager.containers.Edit.clickToJump">
          {title => (
            <a onClick={() => this.handleClick({ value })} title={title}>
              <FormattedMessage id="content-manager.containers.Edit.seeDetails" />
            </a>
          )}
        </FormattedMessage>
      );

    /* eslint-disable jsx-a11y/label-has-for */
    return (
      <div className={`form-group ${styles.selectOne}`}>
        <nav className={styles.headline}>
          <label htmlFor={this.props.relation.alias}>
            {this.props.relation.alias}
          </label>
          {entryLink}
        </nav>
        {description}
        <Select
          onChange={this.handleChange}
          options={this.state.options}
          id={this.props.relation.alias}
          isLoading={this.state.isLoading}
          onMenuScrollToBottom={this.handleBottomScroll}
          onInputChange={this.handleInputChange}
          onSelectResetsInput={false}
          simpleValue
          value={
            isNull(value) || isUndefined(value)
              ? null
              : {
                value: isFunction(value.toJS) ? value.toJS() : value,
                label:
                    templateObject(
                      { mainField: this.props.relation.displayedAttribute },
                      isFunction(value.toJS) ? value.toJS() : value,
                    ).mainField ||
                    (isFunction(value.toJS)
                      ? get(value.toJS(), 'id')
                      : get(value, 'id')),
              }
          }
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectOne.propTypes = {
  onRedirect: PropTypes.func.isRequired,
  record: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired,
  relation: PropTypes.object.isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
};

export default SelectOne;
