/*
 *
 * Search
 *
 */

import React, { memo } from 'react';
import { isEmpty, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { HeaderSearch } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const WAIT = 400;

class Search extends React.Component {
  state = { value: this.props.initValue };

  timer = null;

  componentDidUpdate(prevProps) {
    const { model, value } = this.props;

    if (prevProps.model !== model || (!isEmpty(prevProps.value) && isEmpty(value))) {
      this.resetState();
    }
  }

  resetState = () => this.setState({ value: '' });

  handleChange = ({ target }) => {
    clearTimeout(this.timer);
    this.setState({ value: target.value });
    this.timer = setTimeout(() => this.triggerChange(target.value), WAIT);
  };

  handleClick = () => {
    this.setState({ value: '' });
    this.triggerChange('');
  };

  triggerChange = value =>
    this.props.changeParams({
      target: {
        name: '_q',
        value,
      },
    });

  render() {
    const { model } = this.props;
    const { value } = this.state;

    return (
      <FormattedMessage id={getTrad('components.Search.placeholder')}>
        {placeholder => (
          <HeaderSearch
            label={upperFirst(model)}
            onChange={this.handleChange}
            onClear={this.handleClick}
            placeholder={placeholder}
            value={value}
          />
        )}
      </FormattedMessage>
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

export default memo(Search);
