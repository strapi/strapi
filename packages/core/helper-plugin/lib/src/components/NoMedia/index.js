import React from 'react';
import { EmptyPictures } from '@strapi/icons';
import { EmptyStateLayout } from '@strapi/design-system';

const NoMedia = (props) => {
  return <EmptyStateLayout icon={<EmptyPictures width="10rem" />} {...props} />;
};

export default NoMedia;
