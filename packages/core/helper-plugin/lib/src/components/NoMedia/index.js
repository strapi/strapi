import React from 'react';
import EmptyStatePicture from '@strapi/icons/EmptyStatePicture';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';

const NoMedia = props => {
  return <EmptyStateLayout icon={<EmptyStatePicture width="10rem" />} {...props} />;
};

export default NoMedia;
