import React from 'react';

import { EmptyStateLayout } from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { PrimitiveType, useIntl } from 'react-intl';

export type AnErrorOccurredProps = {
  content?: {
    id: string;
    defaultMessage: string;
    values?: Record<string, PrimitiveType>;
  };
};

const AnErrorOccurred: React.FC<AnErrorOccurredProps> = ({
  content = {
    id: 'anErrorOccurred',
    defaultMessage: 'Woops! Something went wrong. Please, try again.',
    values: {},
  },
  ...rest
}) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      icon={<ExclamationMarkCircle width="10rem" />}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
      {...rest}
    />
  );
};

export { AnErrorOccurred };
