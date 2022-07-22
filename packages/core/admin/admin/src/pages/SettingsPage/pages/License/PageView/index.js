/**
 *
 * EditView
 *
 */
import React, { useEffect, useState } from 'react';

import { useIntl } from 'react-intl';

import format from 'date-fns/format';

import {
  request,
  LoadingIndicatorPage,
  useRBAC,
  SettingsPageTitle,
  ContentBox,
  useAutoReloadOverlayBlocker,
  useNotification,
  useAppInfos,
} from '@strapi/helper-plugin';

import { Box } from '@strapi/design-system/Box';
import { Main } from '@strapi/design-system/Main';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import { TextInput } from '@strapi/design-system/TextInput';
import { HeaderLayout, Layout, ContentLayout } from '@strapi/design-system/Layout';

import Check from '@strapi/icons/Check';
import InformationSquare from '@strapi/icons/InformationSquare';

import adminPermissions from '../../../../../permissions';

const PageView = () => {
  const {
    allowedActions: { canCreate, canRead },
  } = useRBAC(adminPermissions.settings.license);

  const { lockAppWithAutoreload, unlockAppWithAutoreload } = useAutoReloadOverlayBlocker();
  const { currentEnvironment } = useAppInfos();

  const [license, setLicense] = useState('');
  const [savedLicense, setSavedLicense] = useState('');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [globalData, setGlobalData] = useState({ messageId: '', licenseInfo: {} });
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();

  useEffect(() => {
    if (canRead) {
      const fetchLicense = async () => {
        try {
          const {
            data: { messageId, licenseInfo },
          } = await request(
            '/admin/licenses',
            {
              method: 'GET',
            },
            true
          );

          setGlobalData({ messageId, licenseInfo });
          setIsLoading(false);
        } catch (err) {
          console.log(err);
        }
      };

      fetchLicense();
    }
  }, [shouldFetch, canRead]);

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

  console.log(globalData);

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
              {currentEnvironment !== 'development' && canRead && canCreate ? (
                <></>
              ) : (
                <Button
                  startIcon={<Check />}
                  disabled={
                    currentEnvironment !== 'development' ||
                    license.length <= 0 ||
                    license === savedLicense
                  }
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
              <Stack spacing={6}>
                <Box background="neutral0" hasRadius shadow="filterShadow">
                  <ContentBox
                    title={formatMessage({
                      id: 'Settings.license.information',
                      defaultMessage: 'Information',
                    })}
                    subtitle={`${
                      globalData.licenseInfo
                        ? `${globalData.licenseInfo?.type.toUpperCase()} ${formatMessage({
                            id: 'Settings.license.information.license.edition',
                            defaultMessage: 'Edition',
                          })} - ${formatMessage({
                            id: 'Settings.license.information.license.expires_on',
                            defaultMessage: 'Expires on',
                          })}: ${format(globalData.licenseInfo?.expireAt, 'MM/dd/yyyy')}`
                        : `${formatMessage({
                            id: 'Settings.license.information.license.invalid',
                            defaultMessage: 'Community Edition',
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
                  paddingLeft={6}
                  paddingRight={6}
                >
                  <TextInput
                    placeholder={
                      currentEnvironment === 'development'
                        ? formatMessage({
                            id: 'Settings.license.input.placeholder.enabled',
                            defaultMessage: 'ZGQzT1VRMG9CelRPS2JbC8xAwNGt6e...',
                          })
                        : formatMessage({
                            id: 'Settings.license.wrong-env',
                            defaultMessage:
                              'You can activate a license in a development environnment only',
                          })
                    }
                    disabled={currentEnvironment !== 'development' && canCreate}
                    label={formatMessage({
                      id: 'Settings.license.input.label',
                      defaultMessage: 'License',
                    })}
                    name="license"
                    hint={
                      currentEnvironment !== 'development'
                        ? ''
                        : formatMessage({
                            id: 'Settings.license.input.hint',
                            defaultMessage: 'Paste the content of your license',
                          })
                    }
                    onChange={e => setLicense(e.target.value)}
                    value={license}
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
