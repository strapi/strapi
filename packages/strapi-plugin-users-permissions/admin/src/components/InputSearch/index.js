/**
*
* InputSearch
*
*/

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { isEmpty } from 'lodash';
import cn from 'classnames';
import PropTypes from 'prop-types';

import styles from './styles.scss';

class InputSearch extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { errors: [] };

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
                onChange={this.props.onChange}
                value={this.props.value}
                placeholder={message}
                type="text"
              />
            )}
          </FormattedMessage>
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
  value: PropTypes.string,
};

export default InputSearch;
