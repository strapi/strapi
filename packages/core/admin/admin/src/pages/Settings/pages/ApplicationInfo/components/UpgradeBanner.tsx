import * as React from 'react';

import { Box, Button, Flex, IconButton, Typography } from '@strapi/design-system';
import { ArrowUp, Cross, ExternalLink } from '@strapi/icons';
import { useIntl } from 'react-intl';
import major from 'semver/functions/major';
import valid from 'semver/functions/valid';
import { styled } from 'styled-components';

import { useAppInfo } from '../../../../../features/AppInfo';
import { usePersistentStateScope } from '../../../../../hooks/usePersistentState';
import { dismissUpgradeBanner, isUpgradeBannerDismissed } from '../utils/upgradeBannerStorage';

const RELEASES_URL = 'https://github.com/strapi/strapi/releases';
const UPGRADE_DOCS_URL =
  'https://docs.strapi.io/cms/upgrade-tool?utm_source=admin-panel#upgrade-to-a-new-version';

/* -------------------------------------------------------------------------------------------------
 * Styles
 * -----------------------------------------------------------------------------------------------*/

/**
 * The design system has no warning Button variant, so the urgent CTAs restyle existing variants
 * with warning tokens. Text uses `neutral0` (white in light theme) because `warning700` is a pale
 * yellow in dark theme, where white text would be unreadable.
 */
const WarningButton = styled(Button)`
  background: ${({ theme }) => theme.colors.warning700};
  border-color: ${({ theme }) => theme.colors.warning700};

  &:hover:not([aria-disabled='true']),
  &:active {
    background: ${({ theme }) => theme.colors.warning700};
    border-color: ${({ theme }) => theme.colors.warning700};
  }

  & > span {
    color: ${({ theme }) => theme.colors.neutral0};
  }
`;

const WarningOutlineButton = styled(Button)`
  background: transparent;
  border-color: ${({ theme }) => theme.colors.warning700};

  &:hover:not([aria-disabled='true']),
  &:active {
    background: ${({ theme }) => theme.colors.warning100};
    border-color: ${({ theme }) => theme.colors.warning700};
  }

  & > span {
    color: ${({ theme }) => theme.colors.warning700};
  }

  svg path {
    fill: ${({ theme }) => theme.colors.warning700};
  }
`;

// Fixed square so the arrow icon and the "!" glyph render as the same circle
const IconCircle = styled(Flex)`
  width: ${({ theme }) => theme.spaces[7]};
  height: ${({ theme }) => theme.spaces[7]};
`;

/* -------------------------------------------------------------------------------------------------
 * UpgradeBanner
 * -----------------------------------------------------------------------------------------------*/

const UpgradeBanner = () => {
  const { formatMessage } = useIntl();
  const scope = usePersistentStateScope();
  const [isHidden, setIsHidden] = React.useState(false);

  const severity = useAppInfo('UpgradeBanner', (state) => state.strapiUpdateSeverity) ?? 'none';
  const releasesBehind = useAppInfo('UpgradeBanner', (state) => state.strapiReleasesBehind) ?? 0;
  const isMajorBehind = useAppInfo('UpgradeBanner', (state) => state.isStrapiMajorBehind);
  const strapiVersion = useAppInfo('UpgradeBanner', (state) => state.strapiVersion);
  const latestStrapiReleaseTag = useAppInfo(
    'UpgradeBanner',
    (state) => state.latestStrapiReleaseTag
  );

  // Wait for the instance ID so dismissals are always read and written under the project's key
  if (severity === 'none' || !strapiVersion || !latestStrapiReleaseTag || scope === undefined) {
    return null;
  }

  if (
    isHidden ||
    isUpgradeBannerDismissed({ severity, latestVersion: latestStrapiReleaseTag, scope })
  ) {
    return null;
  }

  const handleClose = () => {
    dismissUpgradeBanner({ severity, latestVersion: latestStrapiReleaseTag, scope });
    setIsHidden(true);
  };

  const currentVersion = `v${valid(strapiVersion)}`;
  const latestVersion = `v${valid(latestStrapiReleaseTag)}`;
  const isUrgent = severity === 'urgent';

  const whatsNewProps = {
    tag: 'a',
    href: RELEASES_URL,
    target: '_blank',
    rel: 'noopener noreferrer',
    variant: 'secondary',
    endIcon: <ExternalLink />,
    children: formatMessage({
      id: 'Settings.application.upgrade-banner.whats-new',
      defaultMessage: "What's new",
    }),
  } as const;

  const upgradeDocsProps = {
    tag: 'a',
    href: UPGRADE_DOCS_URL,
    target: '_blank',
    rel: 'noopener noreferrer',
    variant: 'default',
  } as const;

  if (!isUrgent) {
    return (
      <BannerLayout
        variant="primary"
        icon={<ArrowUp fill="neutral0" />}
        title={formatMessage(
          {
            id: 'Settings.application.upgrade-banner.default.title',
            defaultMessage: 'Strapi {latestVersion} is available',
          },
          { latestVersion }
        )}
        message={formatMessage(
          {
            id: 'Settings.application.upgrade-banner.default.body',
            defaultMessage:
              "You're on {currentVersion}. Upgrade to get the latest features, fixes and security patches.",
          },
          { currentVersion }
        )}
        actions={
          <>
            <Button {...whatsNewProps} />
            <Button {...upgradeDocsProps}>
              {formatMessage({
                id: 'Settings.application.upgrade-banner.default.how-to-upgrade',
                defaultMessage: 'How to upgrade',
              })}
            </Button>
          </>
        }
        closeLabel={formatMessage({
          id: 'Settings.application.upgrade-banner.default.dismiss',
          defaultMessage: 'Dismiss for this version',
        })}
        onClose={handleClose}
      />
    );
  }

  return (
    <BannerLayout
      variant="warning"
      icon={
        <Typography fontWeight="bold" textColor="neutral0" aria-hidden>
          !
        </Typography>
      }
      title={
        isMajorBehind
          ? formatMessage(
              {
                id: 'Settings.application.upgrade-banner.urgent.major-title',
                defaultMessage:
                  "You're on Strapi {currentMajor}, version {latestMajor} is available",
              },
              { currentMajor: major(strapiVersion), latestMajor: major(latestStrapiReleaseTag) }
            )
          : formatMessage(
              {
                id: 'Settings.application.upgrade-banner.urgent.title',
                defaultMessage:
                  'Your Strapi version is {count, plural, one {# release} other {# releases}} behind',
              },
              { count: releasesBehind }
            )
      }
      message={formatMessage(
        {
          id: 'Settings.application.upgrade-banner.urgent.body',
          defaultMessage:
            "You're on {currentVersion} and missing fixes and security patches shipped since. Upgrade to {latestVersion} as soon as you can.",
        },
        { currentVersion, latestVersion }
      )}
      actions={
        <>
          <WarningOutlineButton {...whatsNewProps} />
          <WarningButton {...upgradeDocsProps}>
            {formatMessage({
              id: 'Settings.application.upgrade-banner.urgent.upgrade-now',
              defaultMessage: 'Upgrade now',
            })}
          </WarningButton>
        </>
      }
      closeLabel={formatMessage({
        id: 'Settings.application.upgrade-banner.urgent.remind-later',
        defaultMessage: 'Remind me later',
      })}
      onClose={handleClose}
    />
  );
};

/* -------------------------------------------------------------------------------------------------
 * BannerLayout
 * -----------------------------------------------------------------------------------------------*/

interface BannerLayoutProps {
  variant: 'primary' | 'warning';
  icon: React.ReactNode;
  title: string;
  message: string;
  actions: React.ReactNode;
  closeLabel: string;
  onClose: () => void;
}

const BannerLayout = ({
  variant,
  icon,
  title,
  message,
  actions,
  closeLabel,
  onClose,
}: BannerLayoutProps) => (
  <Flex
    role="status"
    alignItems={{ initial: 'start', large: 'center' }}
    gap={4}
    padding={5}
    hasRadius
    shadow="filterShadow"
    background={`${variant}100`}
    borderColor={`${variant}200`}
  >
    <IconCircle
      shrink={0}
      justifyContent="center"
      alignItems="center"
      borderRadius="50%"
      background={variant === 'warning' ? 'warning700' : 'primary600'}
      aria-hidden
    >
      {icon}
    </IconCircle>
    {/* Below the `large` breakpoint, the actions wrap under the message */}
    <Flex
      direction={{ initial: 'column', large: 'row' }}
      alignItems={{ initial: 'start', large: 'center' }}
      gap={{ initial: 3, large: 4 }}
      flex={1}
    >
      <Flex direction="column" alignItems="start" gap={1} flex={1}>
        <Typography fontWeight="bold" textColor="neutral800">
          {title}
        </Typography>
        <Typography textColor="neutral800">{message}</Typography>
      </Flex>
      <Flex shrink={0} gap={2} wrap="wrap">
        {actions}
      </Flex>
    </Flex>
    <Box shrink={0}>
      <IconButton label={closeLabel} variant="ghost" withTooltip={false} onClick={onClose}>
        <Cross />
      </IconButton>
    </Box>
  </Flex>
);

export { UpgradeBanner, RELEASES_URL, UPGRADE_DOCS_URL };
