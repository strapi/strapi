import React, { useRef } from 'react';

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
  SettingsPageTitle,
  useAppInfo,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Check, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useSelector } from 'react-redux';

import { useConfigurations } from '../../../../hooks';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../App/selectors';

import CustomizationInfos from './components/CustomizationInfos';
import { fetchProjectSettings, postProjectSettings } from './utils/api';
import getFormData from './utils/getFormData';

const AdminSeatInfoCE = () => null;

const ApplicationInfosPage = () => {
  const inputsRef = useRef();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  useFocusWhenNavigate();
  const {
    communityEdition,
    latestStrapiReleaseTag,
    nodeVersion,
    shouldUpdateStrapi,
    strapiVersion,
  } = useAppInfo();
  const { updateProjectSettings } = useConfigurations();
  const permissions = useSelector(selectAdminPermissions);
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
  const canSubmit = canRead && canUpdate;

  const { data, isLoading } = useQuery('project-settings', fetchProjectSettings, {
    enabled: canRead,
  });

  const submitMutation = useMutation((body) => postProjectSettings(body), {
    async onSuccess({ menuLogo, authLogo }) {
      await queryClient.invalidateQueries('project-settings', { refetchActive: true });
      updateProjectSettings({ menuLogo: menuLogo?.url, authLogo: authLogo?.url });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canUpdate) return;

    const inputValues = inputsRef.current.getValues();
    const formData = getFormData(inputValues);

    submitMutation.mutate(formData, {
      onSuccess() {
        const { menuLogo, authLogo } = inputValues;

        if (menuLogo.rawFile) {
          trackUsage('didChangeLogo', {
            logo: 'menu',
          });
        }

        if (authLogo.rawFile) {
          trackUsage('didChangeLogo', {
            logo: 'auth',
          });
        }

        toggleNotification({
          type: 'success',
          message: formatMessage({ id: 'app', defaultMessage: 'Saved' }),
        });
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error', defaultMessage: 'An error occurred' },
        });
      },
    });
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
                canSubmit && (
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
