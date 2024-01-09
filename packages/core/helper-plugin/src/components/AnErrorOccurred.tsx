import * as React from 'react';

import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { useIntl } from 'react-intl';

import type { TranslationMessage } from '../types';

export type AnErrorOccurredProps = Omit<EmptyStateLayoutProps, 'content' | 'icon'> & {
  content?: TranslationMessage;
};

const AnErrorOccurred = ({
  content = {
    id: 'anErrorOccurred',
    defaultMessage: 'Woops! Something went wrong. Please, try again.',
    values: {},
  },
  ...rest
}: AnErrorOccurredProps) => {
  const { formatMessage } = useIntl();

  return (
    <EmptyStateLayout
      {...rest}
      icon={<ExclamationMarkCircle width="10rem" />}
      content={formatMessage(
        { id: content.id, defaultMessage: content.defaultMessage },
        content.values
      )}
    />
  );
};

export { AnErrorOccurred };
