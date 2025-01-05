import { useCallback, useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import {
  Page,
  useNotification,
  Layouts,
  useFetchClient,
} from '@strapi/admin/strapi-admin';
import { Box, Button, Field, Flex, Grid, Toggle } from '@strapi/design-system';

import { useTranslation } from '../hooks/useTranslation';
import { Settings } from '..//./../../shared/settings';
import { Check } from '@strapi/icons';
import { PLUGIN_ID } from '../../../shared/constants';
import { useIntl } from 'react-intl';
import useSettings from '../hooks/useSettings';
import { isEqual } from 'lodash';

export const SettingsPage = () => {
  const { formatMessage } = useTranslation();
  const { formatMessage: formatMessageIntl } = useIntl();
  const { toggleNotification } = useNotification();
  const fetchClient = useFetchClient();
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const { settings, isLoading: isFetching } = useSettings({ updateCounter: 0 });
  const [modifiedData, setModifiedData] = useState<Settings | null>(settings || null);

  useEffect(() => {
    if (settings) {
      setModifiedData(settings);
    }
  }, [settings]);

  const updateValues = useCallback((updateValue: (settings: Settings) => Settings | null) => {
    const value = updateValue(modifiedData || settings!) || modifiedData;
    const dataWasModified = !isEqual(modifiedData, value);
    setIsSaveButtonDisabled(!dataWasModified);
    if(dataWasModified) {
      setModifiedData(value || null);
    }
  }, [settings, modifiedData]);

  const { mutateAsync, isLoading: isSubmitting } = useMutation<Settings, any, Settings>(
    async (body) => {
      const { data } = await fetchClient.put(`/${PLUGIN_ID}/settings`, body);
      return data;
    },
    {
      async onSuccess(data) {
        setIsSaveButtonDisabled(true);
        setModifiedData(data);

        toggleNotification({
          type: 'success',
          message: formatMessage({
            id: 'settings.save.success',
            defaultMessage: 'Settings saved',
          }),
        });
      },
      onError(err) {
        console.error(err);
      },
    }
  );

  const handleSubmit = async () => {
    await mutateAsync(modifiedData!);
  };

  const isLoading = isFetching || isSubmitting;

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main tabIndex={-1}>
      <Page.Title>
        {formatMessage({
          id: 'settings.page.title',
          defaultMessage: 'Settings - Group and Arrange',
        })}
      </Page.Title>
      <Layouts.Header
        primaryAction={<>
          <Button
            disabled={isSaveButtonDisabled}
            loading={isLoading}
            type="submit"
            startIcon={<Check />}
            size="S"
            onClick={handleSubmit}
          >
            {formatMessageIntl({
              id: 'global.save',
              defaultMessage: 'Save',
            })}
          </Button>
        </>}
        title={formatMessage({
          id: 'settings.name',
          defaultMessage: 'Group and Arrange',
        })}
        subtitle={formatMessage({
          id: 'settings.description',
          defaultMessage: 'Configure the settings',
        })}
      />
      <Layouts.Content>
        <Layouts.Root>
          <Flex direction="column" alignItems="stretch" gap={12}>
            <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
              <Flex direction="column" alignItems="stretch" gap={4}>
                <Grid.Root gap={6}>
                  <Grid.Item col={6} s={12} direction="column" alignItems="stretch">
                    <Field.Root
                      hint={formatMessage({
                        id: 'settings.always-show-field-type.description',
                        defaultMessage:
                          'When enabled, the field type will always be shown in the list of fields to the left.',
                      })}
                      name="alwaysShowFieldTypeInList"
                    >
                      <Field.Label>{formatMessage({
                        id: 'settings.always-show-field-type.label',
                        defaultMessage: 'Always show field type in list',
                      })}</Field.Label>
                      <Toggle
                        offLabel={formatMessageIntl({
                          id: 'app.components.ToggleCheckbox.off-label',
                          defaultMessage: 'Off',
                        })}
                        onLabel={formatMessageIntl({
                          id: 'app.components.ToggleCheckbox.on-label',
                          defaultMessage: 'On',
                        })}
                        checked={modifiedData?.alwaysShowFieldTypeInList}
                        onChange={e => {
                          updateValues(d => d ? { ...d, alwaysShowFieldTypeInList: e.target.checked } : null);
                        }} />
                    </Field.Root>
                  </Grid.Item>
                </Grid.Root>
              </Flex>
            </Box>
          </Flex>
        </Layouts.Root>
      </Layouts.Content>
    </Page.Main>
  );
};

