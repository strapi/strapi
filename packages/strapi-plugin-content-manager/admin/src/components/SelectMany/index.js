/**
 *
 * SelectMany
 *
 */

import React from 'react';
import Select from 'react-select';
import {SortableContainer, SortableElement, SortableHandle, arrayMove} from 'react-sortable-hoc';

import PropTypes from 'prop-types';

import { cloneDeep, isArray, isNull, isUndefined, get, findIndex, includes } from 'lodash';

import IcoContainer from 'components/IcoContainer';
import Ico from 'components/Ico';

import request from 'utils/request';
import templateObject from 'utils/templateObject';

import 'react-select/dist/react-select.css';
import styles from './styles.scss';

const DragHandle = SortableHandle(() => <span><Ico icoType="bars" /></span>);

const SortableItem = SortableElement(({idx, onRemove, value}) => {
  const icons = [
    {
      icoType: 'trash',
      onClick: () => onRemove(idx),
    },
  ];
  return (
    <li className={styles.sortableListItem}>
      <span>
        <DragHandle />
        <span className="sortable-item--value">{value}</span>
      </span>
      <span className={styles.sortableListItemActions}>
        <IcoContainer icons={icons} />
      </span>
    </li>
  );
});

const SortableList = SortableContainer(({items, onRemove}) => {
  return (
    <ul className={styles.sortableList}>
      {items.map((item, index) => (
        <SortableItem key={`item-${index}`} index={index} idx={index} value={item.label} onRemove={onRemove} />
      ))}
    </ul>
  );
});

class SelectMany extends React.Component {
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

  handleChange = value => {
    const values = get(this.props.record, this.props.relation.alias);

    const target = {
      name: `record.${this.props.relation.alias}`,
      type: 'select',
      value: [...values, value],
    };

    this.props.setRecordAttribute({ target });
  };

  handleBottomScroll = () => {
    this.setState(prevState => {
      return {
        toSkip: prevState.toSkip + 20,
      };
    });
  }

  handleInputChange = (value) => {
    const clonedOptions = this.state.options;
    const filteredValues = clonedOptions.filter(data => includes(data.label, value));

    if (filteredValues.length === 0) {
      return this.getOptions(value);
    }
  }

  handleSortEnd = ({oldIndex, newIndex}) => {
    const values = get(this.props.record, this.props.relation.alias);
    const target = {
      name: `record.${this.props.relation.alias}`,
      type: 'select',
      value: arrayMove(values, oldIndex, newIndex),
    };
    this.props.setRecordAttribute({ target });
  };

  handleRemove = (index) => {
    const values = get(this.props.record, this.props.relation.alias);
    const target = {
      name: `record.${this.props.relation.alias}`,
      type: 'select',
      value: values.filter( (item, idx) => idx !== index),
    };
    this.props.setRecordAttribute({ target });
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
      <div className={`form-group ${styles.selectMany}`}>
        <label htmlFor={this.props.relation.alias}>{this.props.relation.alias}</label>
        {description}
        <Select
          onChange={this.handleChange}
          options={this.state.options}
          id={this.props.relation.alias}
          isLoading={this.state.isLoading}
          onMenuScrollToBottom={this.handleBottomScroll}
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
                        item.value.id,
                  };
                }
              })
          }
          onSortEnd={this.handleSortEnd}
          onRemove={this.handleRemove}
          useDragHandle
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectMany.propTypes = {
  record: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired,
  relation: PropTypes.object.isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
};

export default SelectMany;
