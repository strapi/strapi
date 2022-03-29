import React from 'react';
import { Box } from '@strapi/design-system/Box';
import { BaseCheckbox } from '@strapi/design-system/BaseCheckbox';
import { useFolderCard } from '../contexts/FolderCard';

export const FolderCardCheckbox = props => {
  const { id } = useFolderCard();

  return (
    <Box position="relative" zIndex={2}>
      <BaseCheckbox aria-labelledby={`${id}-title`} {...props} />
    </Box>
  );
};
