import * as React from 'react';

import {
  ConfirmDialog,
  InfoItems,
  useAPIErrorHandler,
  useNotification,
  type DescriptionComponent,
  type InfoItemDescription,
} from '@strapi/admin/strapi-admin';
import { Dialog, Flex, IconButton, Typography } from '@strapi/design-system';
import { Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useDeleteLocaleMutation } from '../services/locales';
import { getTranslation } from '../utils/getTranslation';

import type { Locale } from '../../../shared/contracts/locales';

/* -------------------------------------------------------------------------------------------------
 * Info items, added with `app.getPlugin('i18n').apis.addDeleteLocaleInfo([...])` in `bootstrap`
 * -----------------------------------------------------------------------------------------------*/

type DeleteLocaleInfo = DescriptionComponent<
  { locale: Pick<Locale, 'id' | 'code' | 'name'> },
  InfoItemDescription
>;

const deleteLocaleInfo: DeleteLocaleInfo[] = [];

const addDeleteLocaleInfo = (items: DeleteLocaleInfo[]) => void deleteLocaleInfo.push(...items);

/* -------------------------------------------------------------------------------------------------
 * DeleteLocale
 * -----------------------------------------------------------------------------------------------*/

interface DeleteLocaleProps extends Locale {}

const DeleteLocale = ({ id, code, name }: DeleteLocaleProps) => {
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

      setVisible(false);
    } catch {
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
    <Dialog.Root open={visible} onOpenChange={setVisible}>
      <Dialog.Trigger>
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
          variant="ghost"
        >
          <Trash />
        </IconButton>
      </Dialog.Trigger>
      <ConfirmDialog onConfirm={handleConfirm}>
        <Flex direction="column" gap={3}>
          <Typography>
            {formatMessage({ id: 'app.confirm.body', defaultMessage: 'Are you sure?' })}
          </Typography>
          <InfoItems descriptions={deleteLocaleInfo} props={{ locale: { id, code, name } }} />
        </Flex>
      </ConfirmDialog>
    </Dialog.Root>
  );
};

export { addDeleteLocaleInfo, DeleteLocale };
