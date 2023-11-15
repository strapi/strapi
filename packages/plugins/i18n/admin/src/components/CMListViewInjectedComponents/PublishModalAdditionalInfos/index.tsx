import * as React from 'react';

import { Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import useHasI18n from '../../../hooks/useHasI18n';
import { getTranslation } from '../../../utils';

const Emphasis = (chunks: React.ReactNode) => {
  return (
    <Typography fontWeight="semiBold" textColor="danger500">
      {chunks}
    </Typography>
  );
};

const PublishModalAdditionalInfos = () => {
  const hasI18nEnabled = useHasI18n();
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

export default PublishModalAdditionalInfos;
