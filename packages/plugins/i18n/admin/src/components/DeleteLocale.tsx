import * as React from 'react';

import { ConfirmDialog, useAPIErrorHandler, useNotification } from '@strapi/admin/strapi-admin';
import { IconButton } from '@strapi/design-system';
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
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();

  const [visible, setVisible] = React.useState(false);

  const [deleteLocale] = useDeleteLocaleMutation();
  const handleConfirm = async () => {
    try {
      const res = await deleteLocale(id);

      if ('error' in res) {
        toggleNotification({ type: 'danger', message: formatAPIError(res.error) });

        return;
      }

      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: getTranslation('Settings.locales.modal.delete.success'),
          defaultMessage: 'Deleted locale',
        }),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({
          id: 'notification.error',
          defaultMessage: 'An error occurred, please try again',
        }),
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
      <ConfirmDialog onConfirm={handleConfirm} onClose={() => setVisible(false)} isOpen={visible} />
    </>
  );
};

export { DeleteLocale };
