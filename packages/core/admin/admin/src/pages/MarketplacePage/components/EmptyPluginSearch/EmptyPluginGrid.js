import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { GridLayout } from '@strapi/design-system/Layout';

const EmptyPluginCard = styled(Box)`
  background: linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, #eaeaef 100%);
  opacity: 0.33;
`;

const PlaceholderSize = {
  S: 138,
  M: 234,
};

export const EmptyPluginGrid = ({ count, size }) => {
  return (
    <GridLayout>
      {Array(count)
        .fill(null)
        .map((_, idx) => (
          <EmptyPluginCard
            // eslint-disable-next-line react/no-array-index-key
            key={`empty-plugin-card-${idx}`}
            height={`${PlaceholderSize[size]}px`}
            hasRadius
          />
        ))}
    </GridLayout>
  );
};

EmptyPluginGrid.propTypes = {
  count: PropTypes.number.isRequired,
  size: PropTypes.string.isRequired,
};
