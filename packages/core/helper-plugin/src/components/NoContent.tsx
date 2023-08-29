import React from 'react';

import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons';
import { MessageDescriptor, PrimitiveType, useIntl } from 'react-intl';

export type NoContentProps = Omit<EmptyStateLayoutProps, 'content' | 'icon'> & {
  content?: MessageDescriptor & { values?: Record<string, PrimitiveType> };
};

const NoContent = ({
  content = {
    id: 'app.components.EmptyStateLayout.content-document',
    defaultMessage: 'No content found',
    values: {},
  },
  ...rest
}: NoContentProps) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      {...rest}
      icon={<EmptyDocuments width="10rem" />}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
    />
  );
};

export { NoContent };
