import PropTypes from 'prop-types';
import React from 'react';
import { Success, Remove } from '@buffetjs/icons';
import { useGlobalContext } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';
import RightContentLabel from './RightContentLabel';

const RightLabel = ({ isAvailable }) => {
  const { formatMessage } = useGlobalContext();

  return isAvailable ? (
    <>
      <Success fill="#27b70f" width="20px" height="20px" />
      <RightContentLabel color="green">
        {formatMessage({
          id: `${pluginId}.components.uid.available`,
        })}
      </RightContentLabel>
    </>
  ) : (
    <>
      <Remove fill="#ff203c" width="9px" height="9px" />
      <RightContentLabel color="red">
        {formatMessage({
          id: getTrad('components.uid.unavailable'),
        })}
      </RightContentLabel>
    </>
  );
};

RightLabel.propTypes = {
  isAvailable: PropTypes.bool,
};

RightLabel.defaultProps = {
  isAvailable: false,
};

export default RightLabel;
