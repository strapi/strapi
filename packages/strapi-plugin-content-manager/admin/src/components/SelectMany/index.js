/**
 *
 * SelectMany
 *
 */

import React from 'react';
import Select from 'react-select';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { cloneDeep, includes, isArray, isNull, isUndefined, get, findIndex, isEmpty } from 'lodash';

// Utils.
import request from 'utils/request';
import templateObject from 'utils/templateObject';

// CSS.
import 'react-select/dist/react-select.css';
// Component.
import SortableList from './SortableList';
// CSS.
import styles from './styles.scss';

class SelectMany extends React.PureComponent {
  state = {
    isLoading: true,
    options: [],
    toSkip: 0,
  };

  componentDidMount() {
    this.getOptions('');
  }

  componentDidUpdate(prevProps, prevState) {
    if (isEmpty(prevProps.record) && !isEmpty(this.props.record)) {
      const values = (get(this.props.record, this.props.relation.alias) || [])
        .map(el => (el.id || el._id));

      const options = this.state.options.filter(el => {
        return !values.includes(el.value.id || el.value._id);
      });

      this.state.options = options;
    }

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
      delete params._skip;
      params[`${this.props.relation.displayedAttribute}_contains`] = query;
    }
    // Request URL
    const requestUrl = `/content-manager/explorer/${this.props.relation.model ||
      this.props.relation.collection}`;

    // Call our request helper (see 'utils/request')
    return request(requestUrl, {
      method: 'GET',
      params,
    })
      .then(response => {
        const options = isArray(response)
          ? response.map(item => ({
            value: item,
            label: templateObject({ mainField: this.props.relation.displayedAttribute }, item)
              .mainField,
          }))
          : [
            {
              value: response,
              label: response[this.props.relation.displayedAttribute],
            },
          ];

        const newOptions = cloneDeep(this.state.options);
        options.map(option => {
          // Don't add the values when searching
          if (findIndex(newOptions, o => o.value.id === option.value.id) === -1) {
            return newOptions.push(option);
          }
        });

        return this.setState({
          options: newOptions,
          isLoading: false,
        });
      })
      .catch(() => {
        strapi.notification.error('content-manager.notification.error.relationship.fetch');
      });
  };

  handleInputChange = (value) => {
    const clonedOptions = this.state.options;
    const filteredValues = clonedOptions.filter(data => includes(data.label, value));

    if (filteredValues.length === 0) {
      return this.getOptions(value);
    }
  }

  handleChange = value => {
    // Remove new added value from available option;
    this.state.options = this.state.options.filter(el => 
      !((el.value._id || el.value.id) === (value.value.id || value.value._id))
    );

    this.props.onAddRelationalItem({
      key: this.props.relation.alias,
      value: value.value,
    });
  };

  handleBottomScroll = () => {
    this.setState(prevState => {
      return {
        toSkip: prevState.toSkip + 20,
      };
    });
  }

  handleRemove = (index) => {
    const values = get(this.props.record, this.props.relation.alias);

    // Add removed value from available option;
    const toAdd = {
      value: values[index],
      label: templateObject({ mainField: this.props.relation.displayedAttribute }, values[index]).mainField,
    };

    this.setState(prevState => ({
      options: prevState.options.concat([toAdd]),
    }));

    this.props.onRemoveRelationItem({
      key: this.props.relation.alias,
      index,
    });
  }

  // Redirect to the edit page
  handleClick = (item = {}) => {
    this.props.onRedirect({
      model: this.props.relation.collection || this.props.relation.model,
      id: item.value.id || item.value._id,
      source: this.props.relation.plugin,
    });
  }

  render() {
    const description = this.props.relation.description ? (
      <p>{this.props.relation.description}</p>
    ) : (
      ''
    );
    const value = get(this.props.record, this.props.relation.alias) || [];

    /* eslint-disable jsx-a11y/label-has-for */
    return (
      <div className={`form-group ${styles.selectMany} ${value.length > 4 && styles.selectManyUpdate}`}>
        <label htmlFor={this.props.relation.alias}>{this.props.relation.alias} <span>({value.length})</span></label>
        {description}
        <Select
          className={`${styles.select}`}
          id={this.props.relation.alias}
          isLoading={this.state.isLoading}
          onChange={this.handleChange}
          onInputChange={this.handleInputChange}
          onMenuScrollToBottom={this.handleBottomScroll}
          options={this.state.options}    
          placeholder={<FormattedMessage id='content-manager.containers.Edit.addAnItem' />}
        />
        <SortableList
          items={
            isNull(value) || isUndefined(value) || value.size === 0
              ? null
              : value.map(item => {

                if (item) {
                  return {
                    value: get(item, 'value') || item,
                    label:
                        get(item, 'label') ||
                        templateObject({ mainField: this.props.relation.displayedAttribute }, item)
                          .mainField ||
                        item.id,
                  };
                }
              })
          }
          isDraggingSibling={this.props.isDraggingSibling}
          keys={this.props.relation.alias}
          moveAttr={this.props.moveAttr}
          moveAttrEnd={this.props.moveAttrEnd}
          name={this.props.relation.alias}
          onRemove={this.handleRemove}
          distance={1}
          onClick={this.handleClick}
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectMany.defaultProps = {
  isDraggingSibling: false,
  moveAttr: () => {},
  moveAttrEnd: () => {},
};

SelectMany.propTypes = {
  isDraggingSibling: PropTypes.bool,
  moveAttr: PropTypes.func,
  moveAttrEnd: PropTypes.func,
  onAddRelationalItem: PropTypes.func.isRequired,
  onRedirect: PropTypes.func.isRequired,
  onRemoveRelationItem: PropTypes.func.isRequired,
  record: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired,
  relation: PropTypes.object.isRequired,
};

export default SelectMany;
