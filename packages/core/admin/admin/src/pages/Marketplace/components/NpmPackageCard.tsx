import { Box, Flex, Icon, Tooltip, Typography, Divider, Button } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import {
  useTracking,
  pxToRem,
  AppInfoContextValue,
  useNotification,
  useClipboard,
} from '@strapi/helper-plugin';
import { CheckCircle, ExternalLink, Download, Github, Star, Check, Duplicate } from '@strapi/icons';
import pluralize from 'pluralize';
import { useIntl } from 'react-intl';
import * as semver from 'semver';
import styled from 'styled-components';

import StrapiLogo from '../../../assets/images/logo-strapi-2022.svg';

import type { Plugin, Provider } from '../hooks/useMarketplaceData';
import type { NpmPackageType } from '../MarketplacePage';

// Custom component to have an ellipsis after the 2nd line
const EllipsisText = styled(Typography)`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
`;

interface NpmPackageCardProps extends Pick<AppInfoContextValue, 'useYarn'> {
  npmPackage: Plugin | Provider;
  isInstalled: boolean;
  isInDevelopmentMode: AppInfoContextValue['autoReload'];
  npmPackageType: NpmPackageType;
  strapiAppVersion: AppInfoContextValue['strapiVersion'];
}

const NpmPackageCard = ({
  npmPackage,
  isInstalled,
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
  strapiAppVersion,
}: NpmPackageCardProps) => {
  const { attributes } = npmPackage;
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();

  const commandToCopy = useYarn
    ? `yarn add ${attributes.npmPackageName}`
    : `npm install ${attributes.npmPackageName}`;

  const madeByStrapiMessage = formatMessage({
    id: 'admin.pages.MarketPlacePage.plugin.tooltip.madeByStrapi',
    defaultMessage: 'Made by Strapi',
  });

  const npmPackageHref = `https://market.strapi.io/${pluralize.plural(npmPackageType)}/${
    attributes.slug
  }`;

  return (
    <Flex
      direction="column"
      justifyContent="space-between"
      paddingTop={4}
      paddingRight={4}
      paddingBottom={4}
      paddingLeft={4}
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      height="100%"
      alignItems="normal"
      data-testid="npm-package-card"
    >
      <Box>
        <Flex direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box
            as="img"
            src={attributes.logo.url}
            alt={`${attributes.name} logo`}
            hasRadius
            width={11}
            height={11}
          />
          <PackageStats
            githubStars={attributes.githubStars}
            npmDownloads={attributes.npmDownloads}
            npmPackageType={npmPackageType}
          />
        </Flex>
        <Box paddingTop={4}>
          <Typography as="h3" variant="delta">
            <Flex alignItems="center">
              {attributes.name}
              {attributes.validated && !attributes.madeByStrapi && (
                <Tooltip
                  description={formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugin.tooltip.verified',
                    defaultMessage: 'Plugin verified by Strapi',
                  })}
                >
                  <Flex>
                    <Icon as={CheckCircle} marginLeft={2} color="success600" />
                  </Flex>
                </Tooltip>
              )}
              {attributes.madeByStrapi && (
                <Tooltip description={madeByStrapiMessage}>
                  <Flex>
                    <Box
                      as="img"
                      src={StrapiLogo}
                      alt={madeByStrapiMessage}
                      marginLeft={1}
                      width={6}
                      height="auto"
                    />
                  </Flex>
                </Tooltip>
              )}
            </Flex>
          </Typography>
        </Box>
        <Box paddingTop={2}>
          <EllipsisText as="p" variant="omega" textColor="neutral600">
            {attributes.description}
          </EllipsisText>
        </Box>
      </Box>

      <Flex gap={2} style={{ alignSelf: 'flex-end' }} paddingTop={6}>
        <LinkButton
          size="S"
          href={npmPackageHref}
          isExternal
          endIcon={<ExternalLink />}
          aria-label={formatMessage(
            {
              id: 'admin.pages.MarketPlacePage.plugin.info.label',
              defaultMessage: 'Learn more about {pluginName}',
            },
            { pluginName: attributes.name }
          )}
          variant="tertiary"
          onClick={() => trackUsage('didPluginLearnMore')}
        >
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.info.text',
            defaultMessage: 'More',
          })}
        </LinkButton>
        <InstallPluginButton
          isInstalled={isInstalled}
          isInDevelopmentMode={isInDevelopmentMode}
          commandToCopy={commandToCopy}
          strapiAppVersion={strapiAppVersion}
          strapiPeerDepVersion={attributes.strapiVersion}
          pluginName={attributes.name}
        />
      </Flex>
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * InstallPluginButton
 * -----------------------------------------------------------------------------------------------*/

interface InstallPluginButtonProps
  extends Pick<NpmPackageCardProps, 'isInstalled' | 'isInDevelopmentMode' | 'strapiAppVersion'> {
  commandToCopy: string;
  pluginName: string;
  strapiPeerDepVersion?: string;
}

const InstallPluginButton = ({
  isInstalled,
  isInDevelopmentMode,
  commandToCopy,
  strapiAppVersion,
  strapiPeerDepVersion,
  pluginName,
}: InstallPluginButtonProps) => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { copy } = useClipboard();

  const handleCopy = async () => {
    const didCopy = await copy(commandToCopy);

    if (didCopy) {
      trackUsage('willInstallPlugin');
      toggleNotification({
        type: 'success',
        message: { id: 'admin.pages.MarketPlacePage.plugin.copy.success' },
      });
    }
  };

  // Already installed
  if (isInstalled) {
    return (
      <Box paddingLeft={4}>
        <Icon as={Check} marginRight={2} width={12} height={12} color="success600" />
        <Typography variant="omega" textColor="success600" fontWeight="bold">
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.plugin.installed',
            defaultMessage: 'Installed',
          })}
        </Typography>
      </Box>
    );
  }

  // In development, show install button
  if (isInDevelopmentMode) {
    return (
      <CardButton
        strapiAppVersion={strapiAppVersion}
        strapiPeerDepVersion={strapiPeerDepVersion}
        handleCopy={handleCopy}
        pluginName={pluginName}
      />
    );
  }

  // Not in development and plugin not installed already. Show nothing
  return null;
};

/* -------------------------------------------------------------------------------------------------
 * CardButton
 * -----------------------------------------------------------------------------------------------*/

interface CardButtonProps
  extends Pick<NpmPackageCardProps, 'strapiAppVersion'>,
    Pick<InstallPluginButtonProps, 'strapiPeerDepVersion' | 'pluginName'> {
  handleCopy: () => void;
}

const CardButton = ({
  strapiPeerDepVersion,
  strapiAppVersion,
  handleCopy,
  pluginName,
}: CardButtonProps) => {
  const { formatMessage } = useIntl();
  const versionRange = semver.validRange(strapiPeerDepVersion);
  const isCompatible = semver.satisfies(strapiAppVersion ?? '', versionRange ?? '');

  const installMessage = formatMessage({
    id: 'admin.pages.MarketPlacePage.plugin.copy',
    defaultMessage: 'Copy install command',
  });

  // Only plugins receive a strapiAppVersion
  if (strapiAppVersion) {
    if (!versionRange || !isCompatible) {
      return (
        <Tooltip
          data-testid={`tooltip-${pluginName}`}
          description={
            !versionRange
              ? formatMessage(
                  {
                    id: 'admin.pages.MarketPlacePage.plugin.version.null',
                    defaultMessage:
                      'Unable to verify compatibility with your Strapi version: "{strapiAppVersion}"',
                  },
                  { strapiAppVersion }
                )
              : formatMessage(
                  {
                    id: 'admin.pages.MarketPlacePage.plugin.version',
                    defaultMessage:
                      'Update your Strapi version: "{strapiAppVersion}" to: "{versionRange}"',
                  },
                  {
                    strapiAppVersion,
                    versionRange,
                  }
                )
          }
        >
          <Button
            size="S"
            startIcon={<Duplicate />}
            variant="secondary"
            onClick={handleCopy}
            disabled={!isCompatible}
          >
            {installMessage}
          </Button>
        </Tooltip>
      );
    }
  }

  return (
    <Button size="S" startIcon={<Duplicate />} variant="secondary" onClick={handleCopy}>
      {installMessage}
    </Button>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PackageStats
 * -----------------------------------------------------------------------------------------------*/

interface PackageStatsProps {
  githubStars?: number;
  npmDownloads?: number;
  npmPackageType: NpmPackageType;
}

const PackageStats = ({ githubStars = 0, npmDownloads = 0, npmPackageType }: PackageStatsProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex gap={1}>
      {!!githubStars && (
        <>
          <Icon as={Github} height={pxToRem(12)} width={pxToRem(12)} aria-hidden />
          <Icon as={Star} height={pxToRem(12)} width={pxToRem(12)} color="warning500" aria-hidden />
          <p
            aria-label={formatMessage(
              {
                id: `admin.pages.MarketPlacePage.${npmPackageType}.githubStars`,
                defaultMessage: `This {package} was starred {starsCount} on GitHub`,
              },
              {
                starsCount: githubStars,
                package: npmPackageType,
              }
            )}
          >
            <Typography variant="pi" textColor="neutral800">
              {githubStars}
            </Typography>
          </p>
          <VerticalDivider unsetMargin={false} />
        </>
      )}
      <Icon as={Download} height={pxToRem(12)} width={pxToRem(12)} aria-hidden />
      <p
        aria-label={formatMessage(
          {
            id: `admin.pages.MarketPlacePage.${npmPackageType}.downloads`,
            defaultMessage: `This {package} has {downloadsCount} weekly downloads`,
          },
          {
            downloadsCount: npmDownloads,
            package: npmPackageType,
          }
        )}
      >
        <Typography variant="pi" textColor="neutral800">
          {npmDownloads}
        </Typography>
      </p>
    </Flex>
  );
};

const VerticalDivider = styled(Divider)`
  width: ${pxToRem(12)};
  transform: rotate(90deg);
`;

export { NpmPackageCard };
export type { NpmPackageCardProps };
