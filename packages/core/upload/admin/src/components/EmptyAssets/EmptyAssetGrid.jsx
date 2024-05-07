import React from 'react';

import { Layouts } from '@strapi/admin/strapi-admin';
import { Box } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { styled } from 'styled-components';

const EmptyAssetCard = styled(Box)`
  background: linear-gradient(
    180deg,
    rgba(234, 234, 239, 0) 0%,
    ${({ theme }) => theme.colors.neutral200} 100%
  );
  opacity: 0.33;
`;

const PlaceholderSize = {
  S: 138,
  M: 234,
};

export const EmptyAssetGrid = ({ count, size }) => {
  return (
    <Layouts.Grid size={size}>
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
    </Layouts.Grid>
  );
};

EmptyAssetGrid.propTypes = {
  count: PropTypes.number.isRequired,
  size: PropTypes.string.isRequired,
};
