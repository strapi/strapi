import { useAPIErrorHandler, useNotification, type FormHelpers } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { useUpdateSettingsMutation } from '../services/settings';

import { getFieldErrors } from './validationErrors';

import type { EndUsersSettingsPatch } from '../../../shared/contracts/settings';

/**
 * The submit handler of a settings form: it sends `patch`, then says it saved, or puts each error
 * the server found on its field and says it did not.
 */
const useSaveSettings = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const [update] = useUpdateSettingsMutation();

  return async <TValues extends object>(
    patch: EndUsersSettingsPatch,
    helpers: FormHelpers<TValues>
  ) => {
    const result = await update(patch);

    if ('error' in result) {
      // The form names its fields by dotted path, which is what the errors are keyed by
      helpers.setErrors(getFieldErrors(result.error) as Parameters<typeof helpers.setErrors>[0]);
      toggleNotification({ type: 'danger', message: formatAPIError(result.error) });

      return;
    }

    toggleNotification({
      type: 'success',
      message: formatMessage({ id: 'notification.success.saved', defaultMessage: 'Saved' }),
    });
  };
};

export { useSaveSettings };
