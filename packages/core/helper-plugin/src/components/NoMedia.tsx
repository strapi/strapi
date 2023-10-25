import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { EmptyPictures } from '@strapi/icons';

type NoMediaProps = Omit<EmptyStateLayoutProps, 'icon'>;

/*
 * @deprecated use @strapi/design-system `EmptyStateLayout` instead.
 */
const NoMedia = (props: NoMediaProps) => {
  return <EmptyStateLayout {...props} icon={<EmptyPictures width="10rem" />} />;
};

export { NoMedia };
