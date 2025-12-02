// TODO: find a better naming convention for the file that was an index file before
import * as React from 'react';

import { Page, useNotification, useFetchClient, Layouts } from '@strapi/admin/strapi-admin';
import { useAIAvailability } from '@strapi/admin/strapi-admin/ee';
import { Box, Button, Flex, Grid, Toggle, Typography, Field } from '@strapi/design-system';
import { Check, Sparkle } from '@strapi/icons';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';

import { UpdateSettings } from '../../../../shared/contracts/settings';
import { PERMISSIONS } from '../../constants';
import { useSettings } from '../../hooks/useSettings';
import { getTrad } from '../../utils';

import { init } from './init';
import { initialState, reducer } from './reducer';

import type { InitialState } from './reducer';

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { put } = useFetchClient();

  const [{ initialData, modifiedData }, dispatch] = React.useReducer(reducer, initialState, init);

  const { data, isLoading, refetch } = useSettings();
  const isAIAvailable = useAIAvailability();

  React.useEffect(() => {
    if (data) {
      dispatch({
        type: 'GET_DATA_SUCCEEDED',
        data,
      });
    }
  }, [data]);

  const isSaveButtonDisabled = isEqual(initialData, modifiedData);

  const { mutateAsync, isLoading: isSubmitting } = useMutation<
    UpdateSettings.Response['data'],
    UpdateSettings.Response['error'],
    UpdateSettings.Request['body']
  >(
    async (body) => {
      const { data } = await put('/upload/settings', body);

      return data;
    },
    {
      onSuccess() {
        refetch();

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'notification.form.success.fields' }),
        });
      },
      onError(err: any) {
        toggleNotification({
          type: 'danger',
          message: err.message || formatMessage({ id: 'notification.error' }),
        });
      },
    }
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSaveButtonDisabled) {
      return;
    }

    await mutateAsync(modifiedData!);
  };

  const handleChange = ({
    target: { name, value },
  }: {
    target: { name: keyof NonNullable<InitialState['initialData']>; value: boolean };
  }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  if (isLoading) {
    return <Page.Loading />;
  }

  return (
    <Page.Main tabIndex={-1}>
      <Page.Title>
        {formatMessage({
          id: getTrad('page.title'),
          defaultMessage: 'Settings - Media Library',
        })}
      </Page.Title>
      <form onSubmit={handleSubmit}>
        <Layouts.Header
          title={formatMessage({
            id: getTrad('settings.header.label'),
            defaultMessage: 'Media Library',
          })}
          primaryAction={
            <Button
              disabled={isSaveButtonDisabled}
              loading={isSubmitting}
              type="submit"
              startIcon={<Check />}
              size="S"
            >
              {formatMessage({
                id: 'global.save',
                defaultMessage: 'Save',
              })}
            </Button>
          }
          subtitle={formatMessage({
            id: getTrad('settings.sub-header.label'),
            defaultMessage: 'Configure the settings for the Media Library',
          })}
        />
        <Layouts.Content>
          <Layouts.Root>
            <Flex direction="column" alignItems="stretch" gap={4}>
              {isAIAvailable && (
                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Flex direction="column" alignItems="stretch" gap={1}>
                    <Grid.Root gap={6}>
                      <Grid.Item col={8} xs={12} direction="column" alignItems="stretch">
                        <Flex gap={2}>
                          <Box color="alternative700">
                            <Sparkle />
                          </Box>
                          <Typography variant="delta" tag="h2">
                            {formatMessage({
                              id: getTrad('settings.form.aiMetadata.label'),
                              defaultMessage:
                                'Generate AI captions and alt texts automatically on upload!',
                            })}
                          </Typography>
                        </Flex>
                        <Flex paddingTop={1}>
                          <Typography variant="pi" textColor="neutral600">
                            {formatMessage({
                              id: getTrad('settings.form.aiMetadata.description'),
                              defaultMessage:
                                'Enable this feature to save time, optimize your SEO and increase accessibility by letting our AI generate captions and alternative texts for you.',
                            })}
                          </Typography>
                        </Flex>
                      </Grid.Item>
                      <Grid.Item
                        col={4}
                        xs={12}
                        direction="column"
                        alignItems="end"
                        justifyContent={'center'}
                      >
                        <Field.Root name="aiMetadata" minWidth="200px">
                          <Toggle
                            checked={modifiedData?.aiMetadata}
                            offLabel={formatMessage({
                              id: 'app.components.ToggleCheckbox.disabled-label',
                              defaultMessage: 'Disabled',
                            })}
                            onLabel={formatMessage({
                              id: 'app.components.ToggleCheckbox.enabled-label',
                              defaultMessage: 'Enabled',
                            })}
                            onChange={(e) => {
                              handleChange({
                                target: { name: 'aiMetadata', value: e.target.checked },
                              });
                            }}
                          />
                        </Field.Root>
                      </Grid.Item>
                    </Grid.Root>
                  </Flex>
                </Box>
              )}

              <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                <Flex direction="column" alignItems="stretch" gap={4}>
                  <Flex>
                    <Typography variant="delta" tag="h2">
                      {formatMessage({
                        id: getTrad('settings.blockTitle'),
                        defaultMessage: 'Asset management',
                      })}
                    </Typography>
                  </Flex>
                  <Grid.Root gap={6}>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.responsiveDimensions.description'),
                          defaultMessage:
                            'Enabling this option will generate multiple formats (small, medium and large) of the uploaded asset.',
                        })}
                        name="responsiveDimensions"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.label'),
                            defaultMessage: 'Responsive friendly upload',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.responsiveDimensions}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'responsiveDimensions', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.sizeOptimization.description'),
                          defaultMessage:
                            'Enabling this option will reduce the image size and slightly reduce its quality.',
                        })}
                        name="sizeOptimization"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.sizeOptimization.label'),
                            defaultMessage: 'Size optimization',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.sizeOptimization}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'sizeOptimization', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                    <Grid.Item col={6} xs={12} direction="column" alignItems="stretch">
                      <Field.Root
                        hint={formatMessage({
                          id: getTrad('settings.form.autoOrientation.description'),
                          defaultMessage:
                            'Enabling this option will automatically rotate the image according to EXIF orientation tag.',
                        })}
                        name="autoOrientation"
                      >
                        <Field.Label>
                          {formatMessage({
                            id: getTrad('settings.form.autoOrientation.label'),
                            defaultMessage: 'Auto orientation',
                          })}
                        </Field.Label>
                        <Toggle
                          checked={modifiedData?.autoOrientation}
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={(e) => {
                            handleChange({
                              target: { name: 'autoOrientation', value: e.target.checked },
                            });
                          }}
                        />
                        <Field.Hint />
                      </Field.Root>
                    </Grid.Item>
                  </Grid.Root>
                </Flex>
              </Box>
            </Flex>
          </Layouts.Root>
        </Layouts.Content>
      </form>
    </Page.Main>
  );
};

export const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.settings}>
    <SettingsPage />
  </Page.Protect>
);
