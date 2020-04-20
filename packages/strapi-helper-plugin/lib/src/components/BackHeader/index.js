/*
 *
 *
 * BackHeader
 *
 */

import React from 'react';
import { get } from 'lodash';
import { useRouteMatch } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useGlobalContext } from '../../contexts/GlobalContext';
import StyledBackHeader from './StyledBackHeader';

const BackHeader = props => {
  const { emitEvent } = useGlobalContext();
  const pluginsParams = useRouteMatch('/plugins/:pluginId');
  const settingsParams = useRouteMatch('/settings/:settingType');
  const pluginId = get(pluginsParams, ['params', 'pluginId'], null);
  const settingType = get(settingsParams, ['params', 'settingType'], null);
  const location = pluginId || settingType;

  const handleClick = e => {
    if (location) {
      emitEvent('didGoBack', { location });
    }

    props.onClick(e);
  };

  return <StyledBackHeader {...props} onClick={handleClick} />;
};

BackHeader.defaultProps = {
  onClick: () => {},
};

BackHeader.propTypes = {
  onClick: PropTypes.func,
};

export default BackHeader;
