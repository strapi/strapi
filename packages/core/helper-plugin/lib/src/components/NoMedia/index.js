import React from 'react';
import EmptyPictures from '@strapi/icons/EmptyPictures';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';

const NoMedia = (props) => {
  return <EmptyStateLayout icon={<EmptyPictures width="10rem" />} {...props} />;
};

export default NoMedia;
