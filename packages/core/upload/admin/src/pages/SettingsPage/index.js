import React, { useEffect, useReducer, useRef } from 'react';
import { Helmet } from 'react-helmet';
import isEqual from 'lodash/isEqual';
import { useIntl } from 'react-intl';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  useNotification,
  request,
  useFocusWhenNavigate,
  useOverlayBlocker,
} from '@strapi/helper-plugin';
import { CheckIcon } from '@strapi/icons';
import {
  ContentLayout,
  Box,
  Button,
  Main,
  HeaderLayout,
  Stack,
  Grid,
  GridItem,
  Layout,
  Row,
  ToggleCheckbox,
  H3,
} from '@strapi/parts';
import { getRequestUrl, getTrad } from '../../utils';
import init from './init';
import reducer, { initialState } from './reducer';
import pluginPermissions from '../../permissions';

export const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const [{ initialData, isLoading, isSubmiting, modifiedData }, dispatch] = useReducer(
    reducer,
    initialState,
    init
  );

  const { lockApp, unlockApp } = useOverlayBlocker();

  const isMounted = useRef(true);
  const getDataRef = useRef();
  useFocusWhenNavigate();
  const toggleNotification = useNotification();

  const abortController = new AbortController();

  getDataRef.current = async () => {
    try {
      const { signal } = abortController;
      const { data } = await request(getRequestUrl('settings', { method: 'GET', signal }));

      if (isMounted.current) {
        dispatch({
          type: 'GET_DATA_SUCCEEDED',
          data,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getDataRef.current();

    return () => {
      abortController.abort();
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
      await request(getRequestUrl('settings'), {
        method: 'PUT',
        body: modifiedData,
      });

      if (isMounted.current) {
        dispatch({
          type: 'SUBMIT_SUCCEEDED',
        });
      }

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
    <Main labelledBy="title" tabIndex={-1}>
      <Helmet
        title={formatMessage({
          id: getTrad('page.title'),
          defaultMessage: 'Settings - Media Libray',
        })}
      />
      <form onSubmit={handleSubmit}>
        <HeaderLayout
          id="title"
          title={formatMessage({
            id: getTrad('settings.header.label'),
            defaultMessage: 'Media Library - Settings',
          })}
          primaryAction={
            <Button
              disabled={isSaveButtonDisabled}
              loading={isSubmiting}
              type="submit"
              startIcon={<CheckIcon />}
            >
              {formatMessage({
                id: 'app.components.Button.save',
                defaultMessage: 'Save',
              })}
            </Button>
          }
          subtitle={formatMessage({
            id: getTrad('settings.sub-header.label'),
            defaultMessage: 'Configure the settings for the media library',
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
                    <Row>
                      <Box>
                        <H3>
                          {formatMessage({
                            id: getTrad('settings.section.image.label'),
                            defaultMessage: 'Image',
                          })}
                        </H3>
                      </Box>
                    </Row>
                    <Grid gap={6}>
                      <GridItem col="6" xs="12">
                        <ToggleCheckbox
                          aria-label="responsiveDimensions"
                          data-testid="responsiveDimensions"
                          checked={modifiedData.responsiveDimensions}
                          hint={formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.description'),
                            defaultMessage:
                              'It automatically generates multiple formats (large, medium, small) of the uploaded asset',
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
                        >
                          {formatMessage({
                            id: getTrad('settings.form.responsiveDimensions.label'),
                            defaultMessage: 'Enable responsive friendly upload',
                          })}
                        </ToggleCheckbox>
                      </GridItem>
                      <GridItem col="6" xs="12">
                        <ToggleCheckbox
                          aria-label="sizeOptimization"
                          data-testid="sizeOptimization"
                          checked={modifiedData.sizeOptimization}
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
                        >
                          {formatMessage({
                            id: getTrad('settings.form.sizeOptimization.label'),
                            defaultMessage: 'Enable size optimization (without quality loss)',
                          })}
                        </ToggleCheckbox>
                      </GridItem>
                      <GridItem col="6" xs="12">
                        <ToggleCheckbox
                          aria-label="autoOrientation"
                          data-testid="autoOrientation"
                          checked={modifiedData.autoOrientation}
                          hint={formatMessage({
                            id: getTrad('settings.form.autoOrientation.description'),
                            defaultMessage:
                              'Automatically rotate image according to EXIF orientation tag',
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
                        >
                          {formatMessage({
                            id: getTrad('settings.form.autoOrientation.label'),
                            defaultMessage: 'Enable auto orientation',
                          })}
                        </ToggleCheckbox>
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
