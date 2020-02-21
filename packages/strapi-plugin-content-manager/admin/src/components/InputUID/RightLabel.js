import PropTypes from 'prop-types';
import React from 'react';
import { Success, Remove } from '@buffetjs/icons';
import styled from 'styled-components';
import { useGlobalContext } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

// This component is only used in this file so there is no need to create a separated file.
const RightContentLabel = styled.div`
  padding: 0 5px;
  text-transform: capitalize;
  color: ${props => props.theme.main.colors[props.color]};
`;

const RightLabel = ({ label, availability }) => {
  const { formatMessage } = useGlobalContext();

  if (label) {
    return (
      <RightContentLabel color="blue">
        {formatMessage({
          id: `${pluginId}.components.uid.regenerate`,
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
        <Remove fill="#ff203c" width="12px" height="12px" />
        <RightContentLabel color="red">
          {formatMessage({
            id: `${pluginId}.components.uid.unavailable`,
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
