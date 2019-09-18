/**
 *
 * InputSearchContainer
 *
 */

import React, { useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import PropTypes from 'prop-types';
import { findIndex, has, includes, isEmpty, map, toLower } from 'lodash';

import { Label } from 'strapi-helper-plugin';
import InputSearchLi from '../InputSearchLi';

import { Addon, List, Wrapper } from './Components';

function InputSearchContainer({
  didDeleteUser,
  label,
  name,
  onClickAdd,
  onClickDelete,
  values,
}) {
  const searchInput = useRef(null);
  console.log(values);

  const [filteredUsers, setFilteredUsers] = useState(values);
  const [isAdding, setIsAdding] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [errors, setErrors] = useState([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    if (values !== filteredUsers) {
      setFilteredUsers(values);
    }
  }, [values]);

  const handleBlur = () => setIsFocused(prev => !prev);

  const handleChange = () => {};

  const handleClick = item => {
    console.log(item);
    console.log(isAdding);
    if (isAdding) {
      const id = has(item, '_id') ? '_id' : 'id';
      const users = values;
      // Check if user is already associated with this role
      if (findIndex(users, [id, item[id]]) === -1) {
        onClickAdd(item);
        users.push(item);
      }

      // Reset the input focus
      searchInput.focus();
      // Empty the input and display users
      this.setState({
        value: '',
        isAdding: false,
        users,
        filteredUsers: users,
      });
    } else {
      onClickDelete(item);
    }
  };

  const handleFocus = () => setIsFocused(prev => !prev);

  return (
    <Wrapper className="col-md-6">
      <Label htmlFor={name} message={label} />
      <div className="input-group">
        <Addon className={`input-group-addon ${isFocused && 'focus'}`}>
          <i className="fas fa-search"></i>
        </Addon>
        <FormattedMessage id="users-permissions.InputSearch.placeholder">
          {message => (
            <input
              className={`form-control ${!isEmpty(errors) ? 'is-invalid' : ''}`}
              id={name}
              name={name}
              onBlur={handleBlur}
              onChange={handleChange}
              onFocus={handleFocus}
              value={value}
              placeholder={message}
              type="text"
              ref={searchInput}
            />
          )}
        </FormattedMessage>
      </div>
      <List className={isFocused && 'focused'}>
        <ul>
          {map(filteredUsers, user => (
            <InputSearchLi
              key={user.id || user._id}
              item={user}
              isAdding={isAdding}
              onClick={handleClick}
            />
          ))}
        </ul>
      </List>
    </Wrapper>
  );
}

InputSearchContainer.defaultProps = {
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
