import { EmptyStateLayout, EmptyStateLayoutProps } from '@strapi/design-system';
import { ExclamationMarkCircle } from '@strapi/icons';
import { MessageDescriptor, PrimitiveType, useIntl } from 'react-intl';

export type AnErrorOccurredProps = Omit<EmptyStateLayoutProps, 'content' | 'icon'> & {
  content?: MessageDescriptor & { values?: Record<string, PrimitiveType> };
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
