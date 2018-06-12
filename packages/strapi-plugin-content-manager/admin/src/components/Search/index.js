/*
*
* Search
*
*/

import React from 'react';
import { isEmpty, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import Logo from 'assets/images/icon_filter_blue.svg';
import styles from './styles.scss';

const WAIT = 400;

class Search extends React.Component {
  state = { value: this.props.initValue };

  componentDidUpdate(prevProps) {
    const { model, value } = this.props;

    if (prevProps.model !== model || !isEmpty(prevProps.value) && isEmpty(value)) {
      this.resetState();
    }
  }

  timer = null;

  resetState = () => this.setState({ value: '' });

  handleChange = ({ target }) => {
    clearTimeout(this.timer);
    this.setState({ value: target.value });
    this.timer = setTimeout(() => this.triggerChange(target.value), WAIT);
  }

  handleClick = () => {
    this.setState({ value: '' });
    this.triggerChange('');
  }

  triggerChange = (value) => (
    this.props.changeParams({
      target: {
        name: 'params._q',
        value,
      },
    })
  );

  render() {
    const { model } = this.props;
    const { value } = this.state;

    return (
      <div className={styles.search}>
        <div>
          <FormattedMessage id="content-manager.components.Search.placeholder">
            {(message) => (
              <input
                onChange={this.handleChange}
                placeholder={message}
                type="text"
                value={value}
              />
            )}
          </FormattedMessage>
          {value !== '' && <div className={styles.clearable} onClick={this.handleClick} />}
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
  changeParams: () => {},
  model: '',
  value: '',
};

Search.propTypes = {
  changeParams: PropTypes.func,
  initValue: PropTypes.string.isRequired,
  model: PropTypes.string,
  value: PropTypes.string,
};

export default Search;
