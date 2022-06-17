/**
 *
 * EditView
 *
 */
import React, { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import moment from 'moment';

import {
  request,
  LoadingIndicatorPage,
  useRBAC,
  SettingsPageTitle,
  ContentBox,
  useAutoReloadOverlayBlocker,
  useNotification,
} from '@strapi/helper-plugin';

import { Box } from '@strapi/design-system/Box';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { Tooltip } from '@strapi/design-system/Tooltip';
import { HeaderLayout, Layout, ContentLayout } from '@strapi/design-system/Layout';

import Check from '@strapi/icons/Check';
import Information from '@strapi/icons/Information';
import InformationSquare from '@strapi/icons/InformationSquare';

import adminPermissions from '../../../../../permissions';

const PageView = () => {
  const {
    allowedActions: { canCreate, canRead },
  } = useRBAC(adminPermissions.settings.license);

  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();

  const [license, setLicense] = useState('');
  const [savedLicense, setSavedLicense] = useState('');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [globalData, setGlobalData] = useState({ messageId: '', disabled: true, licenseInfo: {} });
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

  useEffect(() => {
    if (canRead) {
      fetchLicense();
    }
  }, [shouldFetch, canRead]);

  const fetchLicense = async () => {
    try {
      const {
        data: { messageId, disabled, licenseInfo },
      } = await request(
        '/admin/licenses',
        {
          method: 'GET',
        },
        true
      );

      setGlobalData({ messageId, disabled, licenseInfo });
      setIsLoading(false);
    } catch (err) {
      console.log(err);
    }
  };

  const saveLicense = async () => {
    const body = {
      license,
    };

    try {
      lockAppWithAutoreload();

      const {
        data: { messageId, status },
      } = await request(
        '/admin/licenses/generateLicenseFile',
        {
          method: 'POST',
          body,
        },
        true
      );

      if (status === 'ok') {
        setShouldFetch(true);
        setSavedLicense(license);
        toggleNotification({
          type: 'success',
          message: { id: messageId },
        });
      } else {
        toggleNotification({
          type: 'warning',
          message: { id: messageId },
        });
      }
    } catch (error) {
      console.log(error);
    } finally {
      setSavedLicense('');
      setLicense('');
      unlockAppWithAutoreload();
    }
  };

  console.log(globalData.licenseInfo.expireAt);

  return (
    <Layout>
      <SettingsPageTitle name="Webhooks" />
      <Main aria-busy={isLoading}>
        <HeaderLayout
          title={formatMessage({
            id: 'Settings.license.title',
            defaultMessage: 'License Activation',
          })}
          subtitle={formatMessage({
            id: 'Settings.license.description',
            defaultMessage: 'Quickly activate your EE license',
          })}
          primaryAction={
            <>
              {globalData.disabled && canRead && canCreate ? (
                <></>
              ) : (
                <Button
                  startIcon={<Check />}
                  disabled={globalData.disabled || license.length <= 0 || license === savedLicense}
                  variant="default"
                  onClick={saveLicense}
                  size="L"
                >
                  {formatMessage({
                    id: 'Settings.license.button.save',
                    defaultMessage: 'Save',
                  })}
                </Button>
              )}
            </>
          }
        />
        <ContentLayout>
          {isLoading ? (
            <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
              <LoadingIndicatorPage />
            </Box>
          ) : (
            <>
              <Stack spacing={7}>
                <Box background="neutral0" hasRadius shadow="filterShadow">
                  <ContentBox
                    title={formatMessage({
                      id: 'Settings.license.information',
                      defaultMessage: 'Information',
                    })}
                    subtitle={`${formatMessage({
                      id: globalData.messageId,
                      defaultMessage: '',
                    })}. ${
                      globalData.licenseInfo
                        ? `${formatMessage({
                            id: 'Settings.license.information.license.edition',
                            defaultMessage: 'Edition',
                          })} ${globalData.licenseInfo.type} - ${formatMessage({
                            id: 'Settings.license.information.license.expires_on',
                            defaultMessage: 'Expires on',
                          })}: ${moment(globalData.licenseInfo.expireAt).format('MM/DD/YYYY')}`
                        : `${formatMessage({
                            id: 'Settings.license.information.license.invalid',
                            defaultMessage: 'Invalid license',
                          })}`
                    }`}
                    icon={<InformationSquare />}
                    iconBackground="primary100"
                  />
                </Box>
                <Box
                  background="neutral0"
                  hasRadius
                  shadow="filterShadow"
                  paddingTop={6}
                  paddingBottom={6}
                  paddingLeft={7}
                  paddingRight={7}
                >
                  <TextInput
                    placeholder={
                      globalData.disabled
                        ? formatMessage({
                            id: 'Settings.license.input.placeholder.disabled',
                            defaultMessage: 'Update your license in a development environnment',
                          })
                        : formatMessage({
                            id: 'Settings.license.input.placeholder.enabled',
                            defaultMessage: 'ZGQzT1VRMG9CelRPS2JbC8xAwNGt6e...',
                          })
                    }
                    disabled={globalData.disabled && canCreate}
                    label={formatMessage({
                      id: 'Settings.license.input.label',
                      defaultMessage: 'License',
                    })}
                    name="license"
                    hint={
                      globalData.disabled
                        ? ''
                        : formatMessage({
                            id: 'Settings.license.input.hint',
                            defaultMessage: 'Paste the content of your license',
                          })
                    }
                    onChange={e => setLicense(e.target.value)}
                    value={license}
                    labelAction={
                      <Tooltip
                        description={formatMessage({
                          id: 'Settings.license.input.tolltip',
                          defaultMessage:
                            'A license.txt file containing the license will be generated at the root of your project and the server will restart automatically.',
                        })}
                      >
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            padding: 0,
                            background: 'transparent',
                          }}
                        >
                          <Information />
                        </button>
                      </Tooltip>
                    }
                  />
                </Box>
              </Stack>
            </>
          )}
        </ContentLayout>
      </Main>
    </Layout>
  );
};

export default PageView;
