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
import useTracking from '../../../hooks/useTracking';
import StyledBackHeader from './StyledBackHeader';

const BackHeader = props => {
  const { trackUsage } = useTracking();
  const pluginsParams = useRouteMatch('/plugins/:pluginId');
  const settingsParams = useRouteMatch('/settings/:settingType');
  const pluginId = get(pluginsParams, ['params', 'pluginId'], null);
  const settingType = get(settingsParams, ['params', 'settingType'], null);
  const location = pluginId || settingType;

  const handleClick = e => {
    if (location) {
      trackUsage('didGoBack', { location });
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
