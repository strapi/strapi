/**
*
* InputSearchContainer
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { findIndex, has, includes, isEmpty, map, toLower } from 'lodash';
import cn from 'classnames';
import PropTypes from 'prop-types';

import Label from 'components/Label';
import InputSearchLi from 'components/InputSearchLi';

import styles from './styles.scss';

class InputSearchContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = {
    errors: [],
    filteredUsers: this.props.values,
    isAdding: false,
    isFocused: false,
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

  handleBlur = () => this.setState({ isFocused: !this.state.isFocused });

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

  handleFocus = () => this.setState({ isFocused: !this.state.isFocused });

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
        <Label htmlFor={this.props.name} message={this.props.label} />
        <div className={cn('input-group')}>
          <span className={cn('input-group-addon', styles.addon, this.state.isFocused && styles.addonFocus,)} />
          <FormattedMessage id="users-permissions.InputSearch.placeholder">
            {(message) => (
              <input
                className={cn('form-control', !isEmpty(this.state.errors) ? 'is-invalid': '')}
                id={this.props.name}
                name={this.props.name}
                onBlur={this.handleBlur}
                onChange={this.handleChange}
                onFocus={this.handleFocus}
                value={this.state.value}
                placeholder={message}
                type="text"
                ref={(input) => { this.searchInput = input; }}
              />
            )}
          </FormattedMessage>
        </div>
        <div className={cn(styles.ulContainer, this.state.isFocused && styles.ulFocused)}>
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

InputSearchContainer.defaultProps = {
  labelValues: {
    number: 0,
  },
  users: [],
  values: [],
};

InputSearchContainer.propTypes = {
  didDeleteUser: PropTypes.bool.isRequired,
  didFetchUsers: PropTypes.bool.isRequired,
  didGetUsers: PropTypes.bool.isRequired,
  getUser: PropTypes.func.isRequired,
  label: PropTypes.shape({
    id: PropTypes.string,
    params: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onClickAdd: PropTypes.func.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  users: PropTypes.array,
  values: PropTypes.array,
};

export default InputSearchContainer;
