import PropTypes from 'prop-types';
import React from 'react';
import { Success, Remove } from '@buffetjs/icons';
import styled from 'styled-components';
import { useGlobalContext } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';
import getTrad from '../../utils/getTrad';

// Note you don't need to create a specific file for this one
// as it will soon be replaced by the Text one so you can leave it in this file.
const RightContentLabel = styled.div`
  padding: 0 5px;
  text-transform: capitalize;
  font-size: 1.3rem;
  color: ${({ theme, color }) => theme.main.colors[color]};
`;

const RightLabel = ({ label, availability }) => {
  const { formatMessage } = useGlobalContext();

  if (label) {
    return (
      <RightContentLabel color="blue">
        {formatMessage({
          id: getTrad('components.uid.regenerate'),
        })}
      </RightContentLabel>
    );
  }

  if (availability !== null) {
    // This should be more generic in the futur.
    return availability.isAvailable ? (
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
  }

  return null;
};

RightLabel.propTypes = {
  label: PropTypes.string,
  availability: PropTypes.shape({
    isAvailable: PropTypes.bool,
  }),
};

RightLabel.defaultProps = {
  label: null,
  availability: null,
};

export default RightLabel;
