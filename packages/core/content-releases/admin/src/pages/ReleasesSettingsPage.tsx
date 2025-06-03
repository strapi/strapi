import {
  Form,
  Layouts,
  Page,
  useAPIErrorHandler,
  isFetchError,
  useNotification,
  useField,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Button,
  Combobox,
  ComboboxOption,
  Field,
  Flex,
  Grid,
  Typography,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { useTypedSelector } from '../modules/hooks';
import { useGetReleaseSettingsQuery, useUpdateReleaseSettingsMutation } from '../services/release';
import { getTimezones } from '../utils/time';
import { SETTINGS_SCHEMA } from '../validation/schemas';

import type { UpdateSettings } from '../../../shared/contracts/settings';

const ReleasesSettingsPage = () => {
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const { toggleNotification } = useNotification();
  const { data, isLoading: isLoadingSettings } = useGetReleaseSettingsQuery();
  const [updateReleaseSettings, { isLoading: isSubmittingForm }] =
    useUpdateReleaseSettingsMutation();
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions['settings']?.['releases']
  );
  const {
    allowedActions: { canUpdate },
  } = useRBAC(permissions);

  const { timezoneList } = getTimezones(new Date());

  const handleSubmit = async (body: UpdateSettings.Request['body']) => {
    const { defaultTimezone } = body;
    const isBodyTimezoneValid = timezoneList.some((timezone) => timezone.value === defaultTimezone);
    const newBody =
      !defaultTimezone || !isBodyTimezoneValid ? { defaultTimezone: null } : { ...body };
    try {
      const response = await updateReleaseSettings(newBody);

      if ('data' in response) {
        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'content-releases.pages.Settings.releases.setting.default-timezone-notification-success',
            defaultMessage: 'Default timezone updated.',
          }),
        });
      } else if (isFetchError(response.error)) {
        toggleNotification({
          type: 'danger',
          message: formatAPIError(response.error),
        });
      } else {
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
        });
      }
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occurred' }),
      });
    }
  };

  if (isLoadingSettings) {
    return <Page.Loading />;
  }

  return (
    <Layouts.Root>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings - {name}' },
          {
            name: 'Releases',
          }
        )}
      </Page.Title>
      <Page.Main aria-busy={isLoadingSettings} tabIndex={-1}>
        <Form
          method="PUT"
          initialValues={{
            defaultTimezone: data?.data.defaultTimezone,
          }}
          onSubmit={handleSubmit}
          validationSchema={SETTINGS_SCHEMA}
        >
          {({ modified, isSubmitting }: { modified: boolean; isSubmitting: boolean }) => {
            return (
              <>
                <Layouts.Header
                  primaryAction={
                    canUpdate ? (
                      <Button
                        disabled={!modified || isSubmittingForm}
                        loading={isSubmitting}
                        startIcon={<Check />}
                        type="submit"
                      >
                        {formatMessage({
                          id: 'global.save',
                          defaultMessage: 'Save',
                        })}
                      </Button>
                    ) : null
                  }
                  title={formatMessage({
                    id: 'content-releases.pages.Settings.releases.title',
                    defaultMessage: 'Releases',
                  })}
                  subtitle={formatMessage({
                    id: 'content-releases.pages.Settings.releases.description',
                    defaultMessage: 'Create and manage content updates',
                  })}
                />
                <Layouts.Content>
                  <Flex
                    direction="column"
                    background="neutral0"
                    alignItems="stretch"
                    padding={6}
                    gap={6}
                    shadow="filterShadow"
                    hasRadius
                  >
                    <Typography variant="delta" tag="h2">
                      {formatMessage({
                        id: 'content-releases.pages.Settings.releases.preferences.title',
                        defaultMessage: 'Preferences',
                      })}
                    </Typography>
                    <Grid.Root>
                      <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                        <TimezoneDropdown />
                      </Grid.Item>
                    </Grid.Root>
                  </Flex>
                </Layouts.Content>
              </>
            );
          }}
        </Form>
      </Page.Main>
    </Layouts.Root>
  );
};

const TimezoneDropdown = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions['settings']?.['releases']
  );
  const {
    allowedActions: { canUpdate },
  } = useRBAC(permissions);
  const { formatMessage } = useIntl();
  const { timezoneList } = getTimezones(new Date());
  const field = useField('defaultTimezone');
  return (
    <Field.Root
      name="defaultTimezone"
      hint={formatMessage({
        id: 'content-releases.pages.Settings.releases.timezone.hint',
        defaultMessage: 'The timezone of every release can still be changed individually. ',
      })}
      error={field.error}
    >
      <Field.Label>
        {formatMessage({
          id: 'content-releases.pages.Settings.releases.timezone.label',
          defaultMessage: 'Default timezone',
        })}
      </Field.Label>
      <Combobox
        autocomplete={{ type: 'list', filter: 'contains' }}
        onChange={(value) => field.onChange('defaultTimezone', value)}
        onTextValueChange={(value) => field.onChange('defaultTimezone', value)}
        onClear={() => field.onChange('defaultTimezone', '')}
        value={field.value}
        disabled={!canUpdate}
      >
        {timezoneList.map((timezone) => (
          <ComboboxOption key={timezone.value} value={timezone.value}>
            {timezone.value.replace(/&/, ' ')}
          </ComboboxOption>
        ))}
      </Combobox>
      <Field.Hint />
      <Field.Error />
    </Field.Root>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedSettingsPage
 * -----------------------------------------------------------------------------------------------*/

export const ProtectedReleasesSettingsPage = () => {
  const permissions = useTypedSelector(
    (state) => state.admin_app.permissions['settings']?.['releases']?.read
  );

  return (
    <Page.Protect permissions={permissions}>
      <ReleasesSettingsPage />
    </Page.Protect>
  );
};
