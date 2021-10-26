import React from 'react';
import { useIntl } from 'react-intl';
import { ModalBody } from '@strapi/parts/ModalLayout';
import { Button } from '@strapi/parts/Button';
import { NoMedia } from '@strapi/helper-plugin';
import AddIcon from '@strapi/icons/AddIcon';
import getTrad from '../../../../utils/getTrad';

export const BrowseStep = () => {
  const { formatMessage } = useIntl();

  return (
    <ModalBody>
      <NoMedia
        action={
          <Button variant="secondary" startIcon={<AddIcon />} onClick={() => {}}>
            {formatMessage({
              id: getTrad('modal.header.browse'),
              defaultMessage: 'Upload assets',
            })}
          </Button>
        }
        content={formatMessage({
          id: getTrad('list.assets.empty'),
          defaultMessage: 'Upload your first assets...',
        })}
      />
    </ModalBody>
  );
};
