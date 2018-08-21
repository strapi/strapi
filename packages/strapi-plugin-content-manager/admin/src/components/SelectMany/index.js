/**
 *
 * SelectMany
 *
 */

import React from 'react';
import Select from 'react-select';
import { FormattedMessage } from 'react-intl';
import { SortableContainer, SortableElement, arrayMove } from 'react-sortable-hoc';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { cloneDeep, isArray, isNull, isUndefined, get, findIndex, includes, isEmpty } from 'lodash';

// Utils.
import request from 'utils/request';
import templateObject from 'utils/templateObject';

// CSS.
import 'react-select/dist/react-select.css';

// Icons.
import IconRemove from '../../assets/images/icon_remove.svg';

import styles from './styles.scss';

const SortableItem = SortableElement(({idx, onRemove, item, onClick}) => {
  return (
    <li className={styles.sortableListItem}>
      <div>
        <div className={styles.dragHandle}><span></span></div>
        <FormattedMessage id='content-manager.containers.Edit.clickToJump'>
          {title => (
            <span 
              className='sortable-item--value'
              onClick={() => onClick(item)} 
              title={title}
            >
              {item.label}
            </span>
          )}
        </FormattedMessage> 
       
      </div>
      <div className={styles.sortableListItemActions}>
        <img src={IconRemove} alt="Remove Icon" onClick={() => onRemove(idx)} />
      </div>
    </li>
  );
});

const SortableList = SortableContainer(({items, onRemove, onClick}) => {
  const shadowList = (items.length > 4 ? <div className={styles.sortableListLong}></div> : '');

  return (
    <div className={cn(styles.sortableList)}>
      <ul>
        {items.map((item, index) => (
          <SortableItem key={`item-${index}`} index={index} idx={index} item={item} onRemove={onRemove} onClick={onClick} />
        ))}
      </ul>
      {shadowList}
    </div>
  );
});

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

  handleChange = value => {
    const values = get(this.props.record, this.props.relation.alias) || [];

    const target = {
      name: `record.${this.props.relation.alias}`,
      type: 'select',
      value: [...values, value.value],
    };

    // Remove new added value from available option;
    this.state.options = this.state.options.filter(el => {
      if (el.value._id || el.value.id === value.value.id || value.value._id) {
        return false;
      }

      return true;
    });

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

    // Add removed value from available option;
    this.state.options.push({
      value: values[index],
      label: templateObject({ mainField: this.props.relation.displayedAttribute }, values[index])
        .mainField,
    });

    this.props.setRecordAttribute({ target });
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
          onChange={this.handleChange}
          options={this.state.options}
          id={this.props.relation.alias}
          isLoading={this.state.isLoading}
          onMenuScrollToBottom={this.handleBottomScroll}
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
                        item.value.id,
                  };
                }
              })
          }
          onSortEnd={this.handleSortEnd}
          onRemove={this.handleRemove}
          distance={1}
          onClick={this.handleClick}
        />
      </div>
    );
    /* eslint-disable jsx-a11y/label-has-for */
  }
}

SelectMany.propTypes = {
  onRedirect: PropTypes.func.isRequired,
  record: PropTypes.oneOfType([PropTypes.object, PropTypes.bool]).isRequired,
  relation: PropTypes.object.isRequired,
  setRecordAttribute: PropTypes.func.isRequired,
};

export default SelectMany;
