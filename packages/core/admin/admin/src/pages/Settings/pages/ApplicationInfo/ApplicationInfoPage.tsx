import * as React from 'react';

import {
  Box,
  Button,
  ContentLayout,
  Flex,
  Grid,
  GridItem,
  HeaderLayout,
  Layout,
  Link,
  Main,
  Typography,
} from '@strapi/design-system';
import {
  SettingsPageTitle,
  useAppInfo,
  useFocusWhenNavigate,
  useRBAC,
  useTracking,
} from '@strapi/helper-plugin';
import { Check, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useConfiguration } from '../../../../features/Configuration';
import { useEnterprise } from '../../../../hooks/useEnterprise';
import { selectAdminPermissions } from '../../../../selectors';

import { LogoInput, LogoInputProps } from './components/LogoInput';
import { DIMENSION, SIZE } from './utils/constants';

const AdminSeatInfoCE = () => null;

/* -------------------------------------------------------------------------------------------------
 * ApplicationInfoPage
 * -----------------------------------------------------------------------------------------------*/

const ApplicationInfoPage = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { logos: serverLogos, updateProjectSettings } = useConfiguration('ApplicationInfoPage');
  const [logos, setLogos] = React.useState({ menu: serverLogos.menu, auth: serverLogos.auth });
  const { settings } = useSelector(selectAdminPermissions);

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
          '../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/AdminSeatInfo'
        )
      ).AdminSeatInfoEE
  );

  const {
    allowedActions: { canRead, canUpdate },
  } = useRBAC(settings ? settings['project-settings'] : {});

  useFocusWhenNavigate();

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    updateProjectSettings({
      authLogo: logos.auth.custom ?? null,
      menuLogo: logos.menu.custom ?? null,
    });
  };

  const handleChangeLogo =
    (logo: 'menu' | 'auth'): LogoInputProps['onChangeLogo'] =>
    (newLogo) => {
      /**
       * If there's no newLogo value we can assume we're reseting.
       */
      if (newLogo === null) {
        trackUsage('didClickResetLogo', {
          logo,
        });
      }

      setLogos((prev) => ({
        ...prev,
        [logo]: {
          ...prev[logo],
          custom: newLogo,
        },
      }));
    };

  React.useEffect(() => {
    setLogos({
      menu: serverLogos.menu,
      auth: serverLogos.auth,
    });
  }, [serverLogos]);

  // block rendering until the EE component is fully loaded
  if (!AdminSeatInfo) {
    return null;
  }

  const isSaveDisabled =
    logos.auth.custom === serverLogos.auth.custom && logos.menu.custom === serverLogos.menu.custom;

  return (
    <Layout>
      <SettingsPageTitle
        name={formatMessage({
          id: 'Settings.application.header',
          defaultMessage: 'Application',
        })}
      />
      <Main>
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
                <Button disabled={isSaveDisabled} type="submit" startIcon={<Check />}>
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
                      <Link href="https://strapi.io/pricing-self-hosted" endIcon={<ExternalLink />}>
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
              {canRead && (
                <Box
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
                      id: 'Settings.application.customization',
                      defaultMessage: 'Customization',
                    })}
                  </Typography>
                  <Typography variant="pi" textColor="neutral600">
                    {formatMessage(
                      {
                        id: 'Settings.application.customization.size-details',
                        defaultMessage:
                          'Max dimension: {dimension}×{dimension}, Max file size: {size}KB',
                      },
                      { dimension: DIMENSION, size: SIZE }
                    )}
                  </Typography>
                  <Grid paddingTop={4} gap={4}>
                    <GridItem col={6} s={12}>
                      <LogoInput
                        canUpdate={canUpdate}
                        customLogo={logos.menu.custom}
                        defaultLogo={logos.menu.default}
                        hint={formatMessage({
                          id: 'Settings.application.customization.menu-logo.carousel-hint',
                          defaultMessage: 'Replace the logo in the main navigation',
                        })}
                        label={formatMessage({
                          id: 'Settings.application.customization.carousel.menu-logo.title',
                          defaultMessage: 'Menu logo',
                        })}
                        onChangeLogo={handleChangeLogo('menu')}
                      />
                    </GridItem>
                    <GridItem col={6} s={12}>
                      <LogoInput
                        canUpdate={canUpdate}
                        customLogo={logos.auth.custom}
                        defaultLogo={logos.auth.default}
                        hint={formatMessage({
                          id: 'Settings.application.customization.auth-logo.carousel-hint',
                          defaultMessage: 'Replace the logo in the authentication pages',
                        })}
                        label={formatMessage({
                          id: 'Settings.application.customization.carousel.auth-logo.title',
                          defaultMessage: 'Auth logo',
                        })}
                        onChangeLogo={handleChangeLogo('auth')}
                      />
                    </GridItem>
                  </Grid>
                </Box>
              )}
            </Flex>
          </ContentLayout>
        </form>
      </Main>
    </Layout>
  );
};

export { ApplicationInfoPage };
