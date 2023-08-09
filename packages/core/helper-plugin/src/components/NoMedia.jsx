import React from 'react';

import { EmptyStateLayout } from '@strapi/design-system';
import { EmptyPictures } from '@strapi/icons';

const NoMedia = (props) => {
  return <EmptyStateLayout icon={<EmptyPictures width="10rem" />} {...props} />;
};

export { NoMedia };
