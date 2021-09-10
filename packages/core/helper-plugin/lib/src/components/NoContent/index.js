import React from 'react';
import EmptyStateDocument from '@strapi/icons/EmptyStateDocument';
import { EmptyStateLayout } from '@strapi/parts/EmptyStateLayout';

const NoContent = props => {
  return <EmptyStateLayout icon={<EmptyStateDocument width="10rem" />} {...props} />;
};

export default NoContent;
