import {
  EmptyStateLayout as Layout,
  EmptyStateLayoutProps as LayoutProps,
} from '@strapi/design-system';
import { EmptyDocuments, EmptyPermissions, EmptyPictures } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { TranslationMessage } from '../types';

const icons = {
  document: EmptyDocuments,
  media: EmptyPictures,
  permissions: EmptyPermissions,
};

export interface EmptyStateLayoutProps
  extends Pick<LayoutProps, 'action' | 'hasRadius' | 'shadow'> {
  icon?: keyof typeof icons;
  content?: TranslationMessage;
}

const EmptyStateLayout = ({
  action,
  content = {
    id: 'app.components.EmptyStateLayout.content-document',
    defaultMessage: 'No content found',
  },
  hasRadius = true,
  icon = 'document',
  shadow = 'tableShadow',
}: EmptyStateLayoutProps) => {
  const Icon = icons[icon];
  const { formatMessage } = useIntl();

  return (
    <Layout
      action={action}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
      hasRadius={hasRadius}
      icon={<Icon width="10rem" />}
      shadow={shadow}
    />
  );
};

export { EmptyStateLayout };
