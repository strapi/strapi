import * as React from 'react';

import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useContentTypeHasI18n } from '../hooks/useContentTypeHasI18n';
import { getTranslation } from '../utils/getTranslation';

const Emphasis = (chunks: React.ReactNode) => {
  return (
    <Typography fontWeight="semiBold" textColor="danger500">
      {chunks}
    </Typography>
  );
};

const DeleteModalAdditionalInfo = () => {
  const hasI18nEnabled = useContentTypeHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Typography textColor="danger500">
      {formatMessage(
        {
          id: getTranslation('Settings.list.actions.deleteAdditionalInfos'),
          defaultMessage:
            'This will delete the active locale versions <em>(from Internationalization)</em>',
        },
        {
          em: Emphasis,
        }
      )}
    </Typography>
  );
};

const PublishModalAdditionalInfo = () => {
  const hasI18nEnabled = useContentTypeHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Typography textColor="danger500">
      {formatMessage(
        {
          id: getTranslation('Settings.list.actions.publishAdditionalInfos'),
          defaultMessage:
            'This will publish the active locale versions <em>(from Internationalization)</em>',
        },
        {
          em: Emphasis,
        }
      )}
    </Typography>
  );
};

const UnpublishModalAdditionalInfo = () => {
  const hasI18nEnabled = useContentTypeHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Typography textColor="danger500">
      {formatMessage(
        {
          id: getTranslation('Settings.list.actions.unpublishAdditionalInfos'),
          defaultMessage:
            'This will unpublish the active locale versions <em>(from Internationalization)</em>',
        },
        {
          em: Emphasis,
        }
      )}
    </Typography>
  );
};

export { DeleteModalAdditionalInfo, PublishModalAdditionalInfo, UnpublishModalAdditionalInfo };
