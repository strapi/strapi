import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import styled from 'styled-components';
import pluralize from 'pluralize';
import { Box, Typography, Flex, Icon, Tooltip } from '@strapi/design-system';
import { LinkButton } from '@strapi/design-system/v2';
import { ExternalLink, CheckCircle } from '@strapi/icons';
import { useTracking } from '@strapi/helper-plugin';
import StrapiLogo from '../../../../assets/images/logo-strapi-2022.svg';
import InstallPluginButton from './InstallPluginButton';
import PackageStats from './PackageStats';

// Custom component to have an ellipsis after the 2nd line
const EllipsisText = styled(Typography)`
  /* stylelint-disable value-no-vendor-prefix, property-no-vendor-prefix */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  /* stylelint-enable value-no-vendor-prefix, property-no-vendor-prefix */
  overflow: hidden;
`;

const NpmPackageCard = ({
  npmPackage,
  isInstalled,
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
  strapiAppVersion,
}) => {
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

NpmPackageCard.defaultProps = {
  isInDevelopmentMode: false,
  strapiAppVersion: null,
};

NpmPackageCard.propTypes = {
  npmPackage: PropTypes.shape({
    id: PropTypes.string.isRequired,
    attributes: PropTypes.shape({
      name: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      npmPackageName: PropTypes.string.isRequired,
      npmPackageUrl: PropTypes.string.isRequired,
      repositoryUrl: PropTypes.string.isRequired,
      logo: PropTypes.object.isRequired,
      developerName: PropTypes.string.isRequired,
      validated: PropTypes.bool.isRequired,
      madeByStrapi: PropTypes.bool.isRequired,
      strapiCompatibility: PropTypes.oneOf(['v3', 'v4']),
      strapiVersion: PropTypes.string,
      githubStars: PropTypes.number,
      npmDownloads: PropTypes.number,
    }).isRequired,
  }).isRequired,
  isInstalled: PropTypes.bool.isRequired,
  useYarn: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool,
  npmPackageType: PropTypes.string.isRequired,
  strapiAppVersion: PropTypes.string,
};

export default NpmPackageCard;
