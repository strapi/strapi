/**
*
* InputSearch
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { includes, isEmpty, map, toLower } from 'lodash';
import cn from 'classnames';
import PropTypes from 'prop-types';

import InputSearchLi from 'components/InputSearchLi';

import styles from './styles.scss';

class InputSearch extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { errors: [], value: '', users: this.props.values, filteredUsers: this.props.values };

  componentWillReceiveProps(nextProps) {
    if (nextProps.didDeleteUser !== this.props.didDeleteUser) {
      this.setState({ users: nextProps.values, filteredUsers: nextProps.values });
    }
  }

  handleChange = ({ target }) => {
    const filteredUsers = isEmpty(target.value) ?
    this.state.users
    : this.state.users.filter((user) => {
        if (includes(toLower(user.name), toLower(target.value))) {
          return user;
        }
      });
    this.setState({ value: target.value, filteredUsers });
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
              />
            )}
          </FormattedMessage>
        </div>
        <div className={styles.ulContainer}>
          <ul>
            {map(this.state.filteredUsers, (user) => (
              <InputSearchLi key={user.name} item={user} onClickDelete={this.props.onClickDelete} />
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
  value: '',
}

InputSearch.proptypes = {
  label: PropTypes.string.isRequired,
  labelValues: PropTypes.object,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClickDelete: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default InputSearch;
