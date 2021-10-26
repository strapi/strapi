import React from 'react';
import { useIntl } from 'react-intl';
import { Stack } from '@strapi/parts/Stack';
import { Text } from '@strapi/parts/Text';
import { ModalBody } from '@strapi/parts/ModalLayout';
import getTrad from '../../../../utils/getTrad';

export const SelectedStep = () => {
  const { formatMessage } = useIntl();

  return (
    <ModalBody>
      <Stack size={0}>
        <Text small bold textColor="neutral800">
          {formatMessage(
            {
              id: getTrad('list.assets.selected'),
              defaultMessage:
                '{number, plural, =0 {No asset} one {1 asset} other {# assets}} selected',
            },
            { number: 10 }
          )}
        </Text>
        <Text small textColor="neutral600">
          {formatMessage({
            id: getTrad('modal.upload-list.sub-header-subtitle'),
            defaultMessage: 'Manage the assets before adding them to the Media Library',
          })}
        </Text>
      </Stack>
    </ModalBody>
  );
};
