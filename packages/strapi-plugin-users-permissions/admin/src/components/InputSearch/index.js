/**
*
* InputSearch
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { findIndex, has, includes, isEmpty, map, toLower } from 'lodash';
import cn from 'classnames';
import PropTypes from 'prop-types';

import InputSearchLi from 'components/InputSearchLi';

import styles from './styles.scss';

class InputSearch extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = {
    errors: [],
    filteredUsers: this.props.values,
    isAdding: false,
    users: this.props.values,
    value: '',
    autoFocus: false,
  };

  componentWillReceiveProps(nextProps) {
    if (nextProps.didDeleteUser !== this.props.didDeleteUser) {
      this.setState({ users: nextProps.values, filteredUsers: nextProps.values });
    }

    if (nextProps.didGetUsers !== this.props.didGetUsers) {
      this.setState({ users: nextProps.values, filteredUsers: nextProps.values });
    }

    if (nextProps.didFetchUsers !== this.props.didFetchUsers) {
      this.setState({ filteredUsers: nextProps.users, isAdding: true });
    }
  }

  handleChange = ({ target }) => {
    const filteredUsers = isEmpty(target.value) ?
      this.state.users
      : this.state.users.filter((user) => includes(toLower(user.name), toLower(target.value)));

    if (isEmpty(filteredUsers) && !isEmpty(target.value)) {
      this.props.getUser(target.value);
    }

    if (isEmpty(target.value)) {
      return this.setState({ value: target.value, isAdding: false, users: this.props.values, filteredUsers: this.props.values });
    }

    this.setState({ value: target.value, filteredUsers });
  }

  handleClick = (item) => {
    if (this.state.isAdding) {
      const id = has(item, '_id') ? '_id' : 'id';
      const users = this.props.values;
      // Check if user is already associated with this role
      if (findIndex(users, [id, item[id]]) === -1) {
        this.props.onClickAdd(item);
        users.push(item);
      }

      // Reset the input focus
      this.searchInput.focus();
      // Empty the input and display users
      this.setState({ value: '', isAdding: false, users, filteredUsers: users });
    } else {
      this.props.onClickDelete(item);
    }
  }

  render() {
    return (
      <div className={cn(styles.inputSearch, 'col-md-6')}>
        <label htmlFor={this.props.name}>
          <FormattedMessage id={this.props.label} values={this.props.labelValues} />
        </label>
        <div className={cn('input-group')}>
          <span className={cn('input-group-addon', styles.addon)} />
          <FormattedMessage id="users-permissions.InputSearch.placeholder">
            {(message) => (
              <input
                className={cn('form-control', !isEmpty(this.state.errors) ? 'is-invalid': '')}
                id={this.props.name}
                name={this.props.name}
                onChange={this.handleChange}
                value={this.state.value}
                placeholder={message}
                type="text"
                ref={(input) => { this.searchInput = input; }}
              />
            )}
          </FormattedMessage>
        </div>
        <div className={styles.ulContainer}>
          <ul>
            {map(this.state.filteredUsers, (user) => (
              <InputSearchLi
                key={user.id || user._id}
                item={user}
                isAdding={this.state.isAdding}
                onClick={this.handleClick}
              />
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

InputSearch.defaultProps = {
  labelValues: {
    number: 0,
  },
  users: [],
  values: [],
};

InputSearch.propTypes = {
  didDeleteUser: PropTypes.bool.isRequired,
  didFetchUsers: PropTypes.bool.isRequired,
  didGetUsers: PropTypes.bool.isRequired,
  getUser: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  labelValues: PropTypes.object,
  name: PropTypes.string.isRequired,
  onClickAdd: PropTypes.func.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  users: PropTypes.array,
  values: PropTypes.array,
};

export default InputSearch;
