import React from 'react';

import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { EmptyPictures } from '@strapi/icons';

/*
 * @deprecated use @strapi/design-system `EmptyStateLayout` instead.
 */
const NoMedia = (props: EmptyStateLayoutProps) => {
  return <EmptyStateLayout icon={<EmptyPictures width="10rem" />} {...props} />;
};

export { NoMedia };
