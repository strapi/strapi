import * as React from 'react';

import {
  Form,
  Layouts,
  Page,
  useAPIErrorHandler,
  useNotification,
  isFetchError,
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

import { SETTINGS_SCHEMA } from '../../../shared/validation-schemas';
import { getTimezones } from '../components/ReleaseModal';
import { useGetReleaseSettingsQuery, useUpdateReleaseSettingsMutation } from '../services/release';

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { timezoneList, systemTimezone = { value: 'UTC+00:00-Africa/Abidjan ' } } = getTimezones(
    new Date()
  );
  const { data, isLoading: isLoadingSettings } = useGetReleaseSettingsQuery();
  const [updateReleaseSettings, { isLoading: isSubmittingForm }] =
    useUpdateReleaseSettingsMutation();
  const [defaultTimezone, setDefaultTimezone] = React.useState<string>(systemTimezone.value);
  React.useEffect(() => {
    if (data?.data?.defaultTimezone) {
      setDefaultTimezone(data.data.defaultTimezone);
    }
  }, [data]);
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const handleSubmit = async () => {
    const response = await updateReleaseSettings({
      defaultTimezone,
    });
    if ('data' in response) {
      // When the response returns an object with 'data', handle success
      toggleNotification({
        type: 'success',
        message: formatMessage({
          id: 'content-releases.pages.Settings.releases.setting.default-timezone-notification-success',
          defaultMessage: 'Default timezone updated.',
        }),
      });
    } else if (isFetchError(response.error)) {
      // When the response returns an object with 'error', handle fetch error
      toggleNotification({
        type: 'danger',
        message: formatAPIError(response.error),
      });
    } else {
      // Otherwise, the response returns an object with 'error', handle a generic error
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
            defaultTimezone: data?.data?.defaultTimezone || systemTimezone.value,
          }}
          onSubmit={handleSubmit}
          validationSchema={SETTINGS_SCHEMA}
        >
          {({ isSubmitting }: { isSubmitting: boolean }) => {
            return (
              <>
                <Layouts.Header
                  primaryAction={
                    <Button
                      disabled={
                        defaultTimezone === '' ||
                        defaultTimezone === data?.data?.defaultTimezone ||
                        isSubmittingForm
                      }
                      loading={isSubmitting}
                      startIcon={<Check />}
                      type="submit"
                      size="L"
                    >
                      {formatMessage({
                        id: 'global.save',
                        defaultMessage: 'Save',
                      })}
                    </Button>
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
                      <Grid.Item col={6} s={12}>
                        <Field.Root
                          name="defaultTimezone"
                          hint={formatMessage({
                            id: 'content-releases.pages.Settings.releases.timezone.hint',
                            defaultMessage:
                              'The timezone of every release can still be changed individually. ',
                          })}
                        >
                          <Field.Label>
                            {formatMessage({
                              id: 'content-releases.pages.Settings.releases.timezone.label',
                              defaultMessage: 'Default timezone',
                            })}
                          </Field.Label>
                          <Combobox
                            autocomplete={{ type: 'list', filter: 'contains' }}
                            value={defaultTimezone}
                            textValue={
                              defaultTimezone ? defaultTimezone.replace(/&/, ' ') : undefined
                            } // textValue is required to show the updated DST timezone
                            onChange={(timezone) => {
                              setDefaultTimezone(timezone);
                            }}
                            onTextValueChange={(timezone) => {
                              setDefaultTimezone(timezone);
                            }}
                            onClear={() => {
                              setDefaultTimezone('');
                            }}
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
