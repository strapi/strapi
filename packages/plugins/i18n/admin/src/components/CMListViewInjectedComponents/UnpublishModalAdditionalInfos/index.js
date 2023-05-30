import React from 'react';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system';
import { getTrad } from '../../../utils';
import useHasI18n from '../../../hooks/useHasI18n';

const Emphasis = (chunks) => {
  return (
    <Typography fontWeight="semiBold" textColor="danger500">
      {chunks}
    </Typography>
  );
};

const UnpublishModalAdditionalInfos = () => {
  const hasI18nEnabled = useHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Typography textColor="danger500">
      {formatMessage(
        {
          id: getTrad('Settings.list.actions.unpublishAdditionalInfos'),
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

export default UnpublishModalAdditionalInfos;
