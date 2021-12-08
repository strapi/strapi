import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';

const EmptyAssetCard = styled(Box)`
  background: linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, #eaeaef 100%);
  opacity: 0.33;
`;

const GridColSize = {
  S: 180,
  M: 250,
};

const PlaceholderSize = {
  S: 138,
  M: 234,
};

const GridLayout = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ size }) => `${GridColSize[size]}px`}, 1fr));
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

export const EmptyAssetGrid = ({ count, size }) => {
  return (
    <GridLayout size={size}>
      {Array(count)
        .fill(null)
        .map((_, idx) => (
          <EmptyAssetCard
            // eslint-disable-next-line react/no-array-index-key
            key={`empty-asset-card-${idx}`}
            height={`${PlaceholderSize[size]}px`}
            hasRadius
          />
        ))}
    </GridLayout>
  );
};

EmptyAssetGrid.propTypes = {
  count: PropTypes.number.isRequired,
  size: PropTypes.string.isRequired,
};
