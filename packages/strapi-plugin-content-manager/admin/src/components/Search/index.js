/*
 *
 * Search
 *
 */

import React, { memo } from 'react';
import { isEmpty, upperFirst } from 'lodash';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { HeaderSearch, GlobalContext } from 'strapi-helper-plugin';
import getTrad from '../../utils/getTrad';

const WAIT = 400;

class Search extends React.Component {
  static contextType = GlobalContext;

  state = { didType: false, value: this.props.initValue };

  timer = null;

  componentDidUpdate(prevProps) {
    const { model, value } = this.props;

    if (prevProps.model !== model || (!isEmpty(prevProps.value) && isEmpty(value))) {
      this.resetState();
    }
  }

  resetState = () => this.setState({ value: '' });

  handleChange = ({ target }) => {
    if (!this.state.didType) {
      this.context.emitEvent('didSearch');
    }

    clearTimeout(this.timer);
    this.setState({ value: target.value, didType: !!target.value });
    this.timer = setTimeout(() => this.triggerChange(target.value), WAIT);
  };

  handleClick = () => {
    this.setState({ value: '', didType: false });
    this.triggerChange('');
  };

  triggerChange = value => {
    const method = value ? 'push' : 'remove';
    const params = method === 'push' ? { _q: value, page: 1 } : { _q: '' };

    this.props.changeParams(params, method);
  };

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
