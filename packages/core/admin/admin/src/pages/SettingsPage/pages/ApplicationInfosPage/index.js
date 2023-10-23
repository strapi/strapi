import * as React from 'react';

import {
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Layout,
  Link,
  Loader,
  Main,
  Typography,
} from '@strapi/design-system';
import {
  prefixFileUrlWithBackendUrl,
  SettingsPageTitle,
  useAPIErrorHandler,
  useAppInfo,
  useFetchClient,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Check, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMutation, useQuery } from 'react-query';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../../hooks/useConfiguration';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../App/selectors';

import CustomizationInfos from './components/CustomizationInfos';
import getFormData from './utils/getFormData';

const AdminSeatInfoCE = () => null;

const ApplicationInfosPage = () => {
  const inputsRef = React.useRef();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { get, post } = useFetchClient();
  const { updateProjectSettings } = useConfiguration();
  const permissions = useSelector(selectAdminPermissions);
  const { formatAPIError } = useAPIErrorHandler();

  const {
    communityEdition,
    latestStrapiReleaseTag,
    nodeVersion,
    shouldUpdateStrapi,
    strapiVersion,
  } = useAppInfo();

  const AdminSeatInfo = useEnterprise(
    AdminSeatInfoCE,
    async () =>
      (
        await import(
          '../../../../../../ee/admin/pages/SettingsPage/pages/ApplicationInfosPage/components/AdminSeatInfo'
        )
      ).AdminSeatInfoEE
  );

  const {
    allowedActions: { canRead, canUpdate },
  } = useRBAC(permissions.settings['project-settings']);

  useFocusWhenNavigate();

  const { data, isLoading } = useQuery(
    ['project-settings'],
    async () => {
      const { data } = await get('/admin/project-settings');

      return data;
    },
    {
      cacheTime: 0,
      enabled: canRead,
      select(data) {
        return {
          ...data,

          authLogo: data.authLogo
            ? {
                ...data.authLogo,
                url: prefixFileUrlWithBackendUrl(data.authLogo.url),
              }
            : data.authLogo,

          menuLogo: data.menuLogo
            ? {
                ...data.menuLogo,
                url: prefixFileUrlWithBackendUrl(data.menuLogo.url),
              }
            : data.menuLogo,
        };
      },
    }
  );

  const submitMutation = useMutation(
    (body) =>
      post('/admin/project-settings', body, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }),
    {
      onError(error) {
        toggleNotification({
          type: 'warning',
          message: formatAPIError(error),
        });
      },

      async onSuccess(data) {
        const { menuLogo, authLogo } = data;

        updateProjectSettings({ menuLogo: menuLogo?.url, authLogo: authLogo?.url });

        if (menuLogo?.rawFile) {
          trackUsage('didChangeLogo', {
            logo: 'menu',
          });
        }

        if (authLogo?.rawFile) {
          trackUsage('didChangeLogo', {
            logo: 'auth',
          });
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'app', defaultMessage: 'Saved' }),
        });
      },
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();

    submitMutation.mutate(getFormData(inputsRef.current.getValues()));
  };

  // block rendering until the EE component is fully loaded
  if (!AdminSeatInfo) {
    return null;
  }

  return (
    <Layout>
      {/* TODO: Add missing translation */}
      <SettingsPageTitle name="Application" />
      <Main>
        {isLoading ? (
          <Loader>
            {formatMessage({
              id: 'Settings.application.isLoading',
              defaultMessage: 'Loading',
            })}
          </Loader>
        ) : (
          <form onSubmit={handleSubmit}>
            <HeaderLayout
              title={formatMessage({
                id: 'Settings.application.title',
                defaultMessage: 'Overview',
              })}
              subtitle={formatMessage({
                id: 'Settings.application.description',
                defaultMessage: 'Administration panel’s global information',
              })}
              primaryAction={
                canUpdate && (
                  <Button type="submit" startIcon={<Check />}>
                    {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                  </Button>
                )
              }
            />
            <ContentLayout>
              <Flex direction="column" alignItems="stretch" gap={6}>
                <Flex
                  direction="column"
                  alignItems="stretch"
                  gap={4}
                  hasRadius
                  background="neutral0"
                  shadow="tableShadow"
                  paddingTop={6}
                  paddingBottom={6}
                  paddingRight={7}
                  paddingLeft={7}
                >
                  <Typography variant="delta" as="h3">
                    {formatMessage({
                      id: 'global.details',
                      defaultMessage: 'Details',
                    })}
                  </Typography>

                  <Grid gap={5} as="dl">
                    <GridItem col={6} s={12}>
                      <Typography variant="sigma" textColor="neutral600" as="dt">
                        {formatMessage({
                          id: 'Settings.application.strapiVersion',
                          defaultMessage: 'strapi version',
                        })}
                      </Typography>
                      <Flex gap={3} direction="column" alignItems="start" as="dd">
                        <Typography>v{strapiVersion}</Typography>
                        {shouldUpdateStrapi && (
                          <Link
                            href={`https://github.com/strapi/strapi/releases/tag/${latestStrapiReleaseTag}`}
                            isExternal
                            endIcon={<ExternalLink />}
                          >
                            {formatMessage({
                              id: 'Settings.application.link-upgrade',
                              defaultMessage: 'Upgrade your admin panel',
                            })}
                          </Link>
                        )}
                      </Flex>
                    </GridItem>
                    <GridItem col={6} s={12}>
                      <Typography variant="sigma" textColor="neutral600" as="dt">
                        {formatMessage({
                          id: 'Settings.application.edition-title',
                          defaultMessage: 'current plan',
                        })}
                      </Typography>
                      <Flex gap={3} direction="column" alignItems="start" as="dd">
                        <Typography>
                          {formatMessage(
                            {
                              id: 'Settings.application.ee-or-ce',
                              defaultMessage:
                                '{communityEdition, select, true {Community Edition} other {Enterprise Edition}}',
                            },
                            { communityEdition }
                          )}
                        </Typography>
                        <Link
                          href="https://strapi.io/pricing-self-hosted"
                          isExternal
                          endIcon={<ExternalLink />}
                        >
                          {formatMessage({
                            id: 'Settings.application.link-pricing',
                            defaultMessage: 'See all pricing plans',
                          })}
                        </Link>
                      </Flex>
                    </GridItem>

                    <GridItem col={6} s={12}>
                      <Typography variant="sigma" textColor="neutral600" as="dt">
                        {formatMessage({
                          id: 'Settings.application.node-version',
                          defaultMessage: 'node version',
                        })}
                      </Typography>
                      <Typography as="dd">{nodeVersion}</Typography>
                    </GridItem>
                    <AdminSeatInfo />
                  </Grid>
                </Flex>
                {canRead && data && (
                  <CustomizationInfos
                    canUpdate={canUpdate}
                    ref={inputsRef}
                    projectSettingsStored={data}
                  />
                )}
              </Flex>
            </ContentLayout>
          </form>
        )}
      </Main>
    </Layout>
  );
};

export default ApplicationInfosPage;
