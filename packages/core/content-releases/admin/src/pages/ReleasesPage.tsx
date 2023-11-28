import * as React from 'react';

import { Button, HeaderLayout } from '@strapi/design-system';
import { CheckPermissions, useAPIErrorHandler, useNotification } from '@strapi/helper-plugin';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useHistory } from 'react-router-dom';

import { AddEditReleaseDialog, FormValues } from '../components/AddEditReleaseDialog';
import { PERMISSIONS } from '../constants';
import { isAxiosError } from '../services/axios';
import { useCreateReleaseMutation } from '../services/release';

const INITIAL_FORM_VALUES = {
  name: '',
} satisfies FormValues;

const ReleasesPage = () => {
  const [addReleaseDialogIsShown, setAddReleaseDialogIsShown] = React.useState(false);
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { push } = useHistory();
  const { formatAPIError } = useAPIErrorHandler();

  const total = 0; // TODO: replace it with the total number of releases

  const toggleAddReleaseDialog = () => {
    setAddReleaseDialogIsShown((prev) => !prev);
  };

  const [createRelease, { isLoading }] = useCreateReleaseMutation();

  const handleAddRelease = async (values: FormValues) => {
    const response = await createRelease({
      name: values.name,
    });
    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.modal.release-created-notification-success',
          defaultMessage: 'Release created.',
        }),
      });

      push(`/plugins/content-releases/${response.data.data.id}`);
    } else if (isAxiosError(response.error)) {
      // When the response returns an object with 'error', handle axios error
      toggleNotification({
        type: 'warning',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
      toggleNotification({
        type: 'warning',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  return (
    <>
      <HeaderLayout
        title={formatMessage({
          id: 'content-releases.pages.Releases.title',
          defaultMessage: 'Releases',
        })}
        subtitle={formatMessage(
          {
            id: 'content-releases.pages.Releases.header-subtitle',
            defaultMessage: '{number, plural, =0 {No releases} one {# release} other {# releases}}',
          },
          { number: total }
        )}
        primaryAction={
          <CheckPermissions permissions={PERMISSIONS.create}>
            <Button startIcon={<Plus />} onClick={toggleAddReleaseDialog}>
              {formatMessage({
                id: 'content-releases.header.actions.add-release',
                defaultMessage: 'New release',
              })}
            </Button>
          </CheckPermissions>
        }
      />
      {addReleaseDialogIsShown && (
        <AddEditReleaseDialog
          handleClose={toggleAddReleaseDialog}
          handleSubmit={handleAddRelease}
          isLoading={isLoading}
          initialValues={INITIAL_FORM_VALUES}
        />
      )}
    </>
  );
};

const ProtectedReleasesPage = () => (
  <CheckPermissions permissions={PERMISSIONS.main}>
    <ReleasesPage />
  </CheckPermissions>
);

export { ReleasesPage, ProtectedReleasesPage };
