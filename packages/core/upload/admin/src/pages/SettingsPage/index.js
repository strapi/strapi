import React, { useEffect, useReducer, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useFocusWhenNavigate,
  useNotification,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import Check from '@strapi/icons/Check';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { ToggleInput } from '@strapi/design-system/ToggleInput';
import { Typography } from '@strapi/design-system/Typography';
import { Button } from '@strapi/design-system/Button';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { ContentLayout, HeaderLayout, Layout } from '@strapi/design-system/Layout';
import axios from 'axios';
import isEqual from 'lodash/isEqual';
import { axiosInstance, getRequestUrl, getTrad } from '../../utils';
import init from './init';
import reducer, { initialState } from './reducer';
import pluginPermissions from '../../permissions';

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const toggleNotification = useNotification();
  useFocusWhenNavigate();

  const [{ initialData, isLoading, isSubmiting, modifiedData }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );

  const isMounted = useRef(true);

  useEffect(() => {
    const CancelToken = axios.CancelToken;
    const source = CancelToken.source();

    const getData = async () => {
      try {
        const {
          data: { data },
        } = await axiosInstance.get(getRequestUrl('settings'), {
          cancelToken: source.token,
        });

        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      } catch (err) {
        console.error(err);
      }
    };

    if (isMounted.current) {
      getData();
    }

    return () => {
      source.cancel('Operation canceled by the user.');
      isMounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSaveButtonDisabled = isEqual(initialData, modifiedData);

  const handleSubmit = async e => {
    e.preventDefault();

    if (isSaveButtonDisabled) {
      return;
    }

    lockApp();

    dispatch({ type: 'ON_SUBMIT' });

    try {
      await axiosInstance.put(getRequestUrl('settings'), modifiedData);

      dispatch({
        type: 'SUBMIT_SUCCEEDED',
      });

      toggleNotification({
        type: 'success',
        message: { id: 'notification.form.success.fields' },
      });
    } catch (err) {
      console.error(err);

      dispatch({ type: 'ON_SUBMIT_ERROR' });
    }

    unlockApp();
  };

  const handleChange = ({ target: { name, value } }) => {
    dispatch({
      type: 'ON_CHANGE',
      keys: name,
      value,
    });
  };

  return (
    <Main tabIndex={-1}>
      <Helmet
        title={formatMessage({
          id: getTrad('page.title'),
          defaultMessage: 'Settings - Media Libray',
        })}
      />
      <form onSubmit={handleSubmit}>
        <HeaderLayout
          title={formatMessage({
            id: getTrad('settings.header.label'),
            defaultMessage: 'Media Library',
          })}
          primaryAction={
            <Button
              disabled={isSaveButtonDisabled}
              data-testid="save-button"
              loading={isSubmiting}
              type="submit"
              startIcon={<Check />}
              size="L"
            >
              {formatMessage({
                id: 'app.components.Button.save',
                defaultMessage: 'Save',
              })}
            </Button>
          }
          subtitle={formatMessage({
            id: getTrad('settings.sub-header.label'),
            defaultMessage: 'Configure the settings for the Media Library',
          })}
        />
        <ContentLayout>
          {isLoading ? (
            <LoadingIndicatorPage />
          ) : (
            <Layout>
              <Stack size={12}>
                <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
                  <Stack size={4}>
                    <Flex>
                      <Typography variant="delta" as="h2">
                        {formatMessage({
                          id: getTrad('settings.blockTitle'),
                          defaultMessage: 'Asset management',
                        })}
                      </Typography>
                    </Flex>
                    <Grid gap={6}>
                      <GridItem col={6} s={12}>
                        <ToggleInput
                          aria-label="responsiveDimensions"
                          data-testid="responsiveDimensions"
                          checked={modifiedData.responsiveDimensions}
                          hint={formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.description'),
                            defaultMessage:
                              'Enabling this option will generate multiple formats (small, medium and large) of the uploaded asset.',
                          })}
                          label={formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.label'),
                            defaultMessage: 'Responsive friendly upload',
                          })}
                          name="responsiveDimensions"
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={e => {
                            handleChange({
                              target: { name: 'responsiveDimensions', value: e.target.checked },
                            });
                          }}
                        />
                      </GridItem>
                      <GridItem col={6} s={12}>
                        <ToggleInput
                          aria-label="sizeOptimization"
                          data-testid="sizeOptimization"
                          checked={modifiedData.sizeOptimization}
                          hint={formatMessage({
                            id: getTrad('settings.form.sizeOptimization.description'),
                            defaultMessage:
                              'Enabling this option will optimize the file size without compromising on the quality.',
                          })}
                          label={formatMessage({
                            id: getTrad('settings.form.sizeOptimization.label'),
                            defaultMessage: 'Size optimization',
                          })}
                          name="sizeOptimization"
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={e => {
                            handleChange({
                              target: { name: 'sizeOptimization', value: e.target.checked },
                            });
                          }}
                        />
                      </GridItem>
                      <GridItem col={6} s={12}>
                        <ToggleInput
                          aria-label="autoOrientation"
                          data-testid="autoOrientation"
                          checked={modifiedData.autoOrientation}
                          hint={formatMessage({
                            id: getTrad('settings.form.autoOrientation.description'),
                            defaultMessage:
                              'Enabling this option will automatically rotate the image according to EXIF orientation tag.',
                          })}
                          label={formatMessage({
                            id: getTrad('settings.form.autoOrientation.label'),
                            defaultMessage: 'Auto orientation',
                          })}
                          name="autoOrientation"
                          offLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.off-label',
                            defaultMessage: 'Off',
                          })}
                          onLabel={formatMessage({
                            id: 'app.components.ToggleCheckbox.on-label',
                            defaultMessage: 'On',
                          })}
                          onChange={e => {
                            handleChange({
                              target: { name: 'autoOrientation', value: e.target.checked },
                            });
                          }}
                        />
                      </GridItem>
                    </Grid>
                  </Stack>
                </Box>
              </Stack>
            </Layout>
          )}
        </ContentLayout>
      </form>
    </Main>
  );
};

const ProtectedSettingsPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.settings}>
    <SettingsPage />
  </CheckPagePermissions>
);

export default ProtectedSettingsPage;
