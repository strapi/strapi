import { useAPIErrorHandler, useNotification, type FormHelpers } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';

import { useUpdateSettingsMutation } from '../services/settings';

import { getFormErrors, leafPaths } from './validationErrors';

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
      // The form reads its errors by nested path; the fields are the values of what was sent. What
      // no field reads has nowhere to show, so the toast says it.
      const leaves = leafPaths(patch);
      const { errors } = getFormErrors(result.error, {
        isShown: (path) => leaves.some((leaf) => leaf === path || leaf.startsWith(`${path}.`)),
      });

      helpers.setErrors(errors as Parameters<typeof helpers.setErrors>[0]);
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
