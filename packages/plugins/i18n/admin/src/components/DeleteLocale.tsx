import * as React from 'react';

import { IconButton } from '@strapi/design-system';
import { ConfirmDialog, useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDeleteLocaleMutation } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { Locale } from '../../../shared/contracts/locales';

/* -------------------------------------------------------------------------------------------------
 * DeleteLocale
 * -----------------------------------------------------------------------------------------------*/

interface DeleteLocaleProps extends Locale {}

const DeleteLocale = ({ id, name }: DeleteLocaleProps) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [visible, setVisible] = React.useState(false);

  const [deleteLocale, { isLoading }] = useDeleteLocaleMutation();
  const handleConfirm = async () => {
    try {
      const res = await deleteLocale(id);

      if ('error' in res) {
        toggleNotification({ type: 'warning', message: formatAPIError(res.error) });

        return;
      }

      toggleNotification({
        type: 'success',
        message: {
          id: getTranslation('Settings.locales.modal.delete.success'),
          defaultMessage: 'Deleted locale',
        },
      });
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: {
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again',
        },
      });
    }
  };

  return (
    <>
      <IconButton
        onClick={() => setVisible(true)}
        label={formatMessage(
          {
            id: getTranslation('Settings.list.actions.delete'),
            defaultMessage: 'Delete {name} locale',
          },
          {
            name,
          }
        )}
        icon={<Trash />}
        borderWidth={0}
      />
      <ConfirmDialog
        isConfirmButtonLoading={isLoading}
        onConfirm={handleConfirm}
        onToggleDialog={() => setVisible(false)}
        isOpen={visible}
      />
    </>
  );
};

export { DeleteLocale };
