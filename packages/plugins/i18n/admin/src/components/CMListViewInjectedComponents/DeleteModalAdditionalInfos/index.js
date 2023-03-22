import React from 'react';
import { useIntl } from 'react-intl';
import { Typography } from '@strapi/design-system';
import { getTrad } from '../../../utils';
import useHasI18n from '../../../hooks/useHasI18n';

const DeleteModalAdditionalInfos = () => {
  const hasI18nEnabled = useHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Typography textColor="danger500">
      {formatMessage(
        {
          id: getTrad('Settings.list.actions.deleteAdditionalInfos'),
          defaultMessage:
            'This will delete the active locale versions <em>(from Internationalization)</em>',
        },
        {
          em: (chunks) => (
            <Typography fontWeight="semiBold" textColor="danger500">
              {chunks}
            </Typography>
          ),
        }
      )}
    </Typography>
  );
};

export default DeleteModalAdditionalInfos;
