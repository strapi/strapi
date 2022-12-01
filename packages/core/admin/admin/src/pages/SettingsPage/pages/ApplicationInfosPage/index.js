import React, { useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useIntl } from 'react-intl';
import {
  useAppInfos,
  SettingsPageTitle,
  useFocusWhenNavigate,
  useNotification,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { HeaderLayout, Layout, ContentLayout } from '@strapi/design-system/Layout';
import { Main } from '@strapi/design-system/Main';
import { Box } from '@strapi/design-system/Box';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import { Typography } from '@strapi/design-system/Typography';
import { Stack } from '@strapi/design-system/Stack';
import { Button } from '@strapi/design-system/Button';
import { Link } from '@strapi/design-system/v2/Link';
import ExternalLink from '@strapi/icons/ExternalLink';
import Check from '@strapi/icons/Check';
import adminPermissions from '../../../../permissions';
import { useConfigurations } from '../../../../hooks';
import Form from './components/Form';
import { fetchProjectSettings, postProjectSettings } from './utils/api';
import getFormData from './utils/getFormData';

const ApplicationInfosPage = () => {
  const inputsRef = useRef();
  const toggleNotification = useNotification();
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();
  useFocusWhenNavigate();
  const appInfos = useAppInfos();
  const { shouldUpdateStrapi, latestStrapiReleaseTag, strapiVersion } = appInfos;
  const { updateProjectSettings } = useConfigurations();

  const {
    allowedActions: { canRead, canUpdate },
  } = useRBAC(adminPermissions.settings['project-settings']);

  const { data } = useQuery('project-settings', fetchProjectSettings);

  const currentPlan = appInfos.communityEdition
    ? 'app.components.UpgradePlanModal.text-ce'
    : 'app.components.UpgradePlanModal.text-ee';

  const submitMutation = useMutation((body) => postProjectSettings(body), {
    async onSuccess({ menuLogo, authLogo }) {
      await queryClient.invalidateQueries('project-settings', { refetchActive: true });
      updateProjectSettings({ menuLogo: menuLogo?.url, authLogo: authLogo?.url });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const inputValues = inputsRef.current.getValues();
    const formData = getFormData(inputValues);

    submitMutation.mutate(formData, {
      onSuccess() {
        const { menuLogo } = inputValues;

        if (menuLogo.rawFile) {
          trackUsage('didChangeLogo');
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

  return (
    <Layout>
      <SettingsPageTitle name="Application" />
      <Main>
        <form onSubmit={handleSubmit}>
          <HeaderLayout
            title={formatMessage({ id: 'Settings.application.title', defaultMessage: 'Overview' })}
            subtitle={formatMessage({
              id: 'Settings.application.description',
              defaultMessage: 'Administration panel’s global information',
            })}
            primaryAction={
              canRead && canUpdate ? (
                <Button type="submit" startIcon={<Check />}>
                  {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
                </Button>
              ) : null
            }
          />
          <ContentLayout>
            <Stack spacing={6}>
              <Box
                hasRadius
                background="neutral0"
                shadow="tableShadow"
                paddingTop={6}
                paddingBottom={6}
                paddingRight={7}
                paddingLeft={7}
              >
                <Stack spacing={5}>
                  <Typography variant="delta" as="h3">
                    {formatMessage({
                      id: 'global.details',
                      defaultMessage: 'Details',
                    })}
                  </Typography>

                  <Grid paddingTop={1}>
                    <GridItem col={6} s={12}>
                      <Typography variant="sigma" textColor="neutral600">
                        {formatMessage({
                          id: 'Settings.application.strapiVersion',
                          defaultMessage: 'strapi version',
                        })}
                      </Typography>
                      <Typography as="p">v{strapiVersion}</Typography>
                      <Link
                        href={
                          appInfos.communityEdition
                            ? 'https://discord.strapi.io'
                            : 'https://support.strapi.io/support/home'
                        }
                        isExternal
                        endIcon={<ExternalLink />}
                      >
                        {formatMessage({
                          id: 'Settings.application.get-help',
                          defaultMessage: 'Get help',
                        })}
                      </Link>
                    </GridItem>
                    <GridItem col={6} s={12}>
                      <Typography variant="sigma" textColor="neutral600">
                        {formatMessage({
                          id: 'Settings.application.edition-title',
                          defaultMessage: 'current plan',
                        })}
                      </Typography>
                      <Typography as="p">
                        {formatMessage({
                          id: currentPlan,
                          defaultMessage: `${
                            appInfos.communityEdition ? 'Community Edition' : 'Enterprise Edition'
                          }`,
                        })}
                      </Typography>
                    </GridItem>
                  </Grid>

                  <Grid paddingTop={1}>
                    <GridItem col={6} s={12}>
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
                    </GridItem>
                    <GridItem col={6} s={12}>
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
                    </GridItem>
                  </Grid>

                  <Box paddingTop={1}>
                    <Typography variant="sigma" textColor="neutral600">
                      {formatMessage({
                        id: 'Settings.application.node-version',
                        defaultMessage: 'node version',
                      })}
                    </Typography>
                    <Typography as="p">{appInfos.nodeVersion}</Typography>
                  </Box>
                </Stack>
              </Box>
              {canRead && data && (
                <Form canUpdate={canUpdate} ref={inputsRef} projectSettingsStored={data} />
              )}
            </Stack>
          </ContentLayout>
        </form>
      </Main>
    </Layout>
  );
};

export default ApplicationInfosPage;
