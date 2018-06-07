/*
*
* Search
*
*/

import React from 'react';
import { upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Logo from 'assets/images/icon_filter.png';
import styles from './styles.scss';

const WAIT = 100;

class Search extends React.Component {
  state = { value: '' };

  timer = null;

  handleChange = ({ target }) => {
    clearTimeout(this.timer);
    this.setState({ value: target.value });
    this.timer = setTimeout(this.triggerChange, WAIT);
  }

  // TODO check if we send the request only when the user is done typing
  triggerChange = () => {
    console.log('End typing');

    // this.props......
  }

  render() {
    const { model } = this.props;

    return (
      <div className={styles.search}>
        <div>
          <FormattedMessage id="content-manager.components.Search.placeholder">
            {(message) => (
              <input
                onChange={this.handleChange}
                placeholder={message}
                type="text"
                value={this.state.value}
              />
            )}
          </FormattedMessage>
        </div>
        <div className={styles.searchLabel}>
          <img src={Logo} alt="filter_logo" />
          {upperFirst(model)}
        </div>
      </div>
    );
  }
}

Search.defaultProps = {
  model: '',
};

Search.propTypes = {
  model: PropTypes.string,
};

export default Search;
