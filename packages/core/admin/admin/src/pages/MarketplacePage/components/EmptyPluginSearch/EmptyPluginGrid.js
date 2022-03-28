import React from 'react';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { GridLayout } from '@strapi/design-system/Layout';

const EmptyPluginCard = styled(Box)`
  background: ${({ theme }) =>
    `linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, ${theme.colors.neutral150} 100%)`};
  opacity: 0.33;
`;

export const EmptyPluginGrid = () => {
  return (
    <GridLayout>
      {Array(12)
        .fill(null)
        .map((_, idx) => (
          <EmptyPluginCard
            // eslint-disable-next-line react/no-array-index-key
            key={`empty-plugin-card-${idx}`}
            height="234px"
            hasRadius
          />
        ))}
    </GridLayout>
  );
};
