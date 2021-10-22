import React from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@strapi/parts/Text';
import { getTrad } from '../../../utils';
import useHasI18n from '../../../hooks/useHasI18n';

const DeleteModalAdditionalInfos = () => {
  const hasI18nEnabled = useHasI18n();
  const { formatMessage } = useIntl();

  if (!hasI18nEnabled) {
    return null;
  }

  return (
    <Text textColor="danger500">
      {formatMessage(
        {
          id: getTrad('Settings.list.actions.deleteAdditionalInfos'),
          defaultMessage:
            'This will delete the active locale versions <em>(from Internationalization)</em>',
        },
        {
          em: chunks => (
            <Text textColor="danger500" bold>
              {chunks}
            </Text>
          ),
        }
      )}
    </Text>
  );
};

export default DeleteModalAdditionalInfos;
