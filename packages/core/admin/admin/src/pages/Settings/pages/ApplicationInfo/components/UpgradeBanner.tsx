import * as React from 'react';

import { Alert, Button, Flex } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
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
 * `Alert` colors every link inside `action` with its variant color (`& a > span`, `svg path`),
 * which breaks Buttons rendered as links (e.g. warning700 text on a primary600 Button).
 * Restore the Button's own colors until the design system scopes that rule to plain links.
 */
const AlertActions = styled(Flex)`
  && a > span {
    color: inherit;
  }

  && svg path {
    fill: currentColor;
  }
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

  const title = !isUrgent
    ? formatMessage(
        {
          id: 'Settings.application.upgrade-banner.default.title',
          defaultMessage: 'Strapi {latestVersion} is available',
        },
        { latestVersion }
      )
    : isMajorBehind
      ? formatMessage(
          {
            id: 'Settings.application.upgrade-banner.urgent.major-title',
            defaultMessage: 'Strapi {latestMajor} is available',
          },
          { latestMajor: major(latestStrapiReleaseTag) }
        )
      : formatMessage(
          {
            id: 'Settings.application.upgrade-banner.urgent.title',
            defaultMessage:
              'Your Strapi version is {count, plural, one {# minor version} other {# minor versions}} behind',
          },
          { count: releasesBehind }
        );

  const message = isUrgent
    ? formatMessage(
        {
          id: 'Settings.application.upgrade-banner.urgent.body',
          defaultMessage:
            'You are on {currentVersion} and missing the fixes released since. Upgrade to {latestVersion} as soon as you can.',
        },
        { currentVersion, latestVersion }
      )
    : formatMessage(
        {
          id: 'Settings.application.upgrade-banner.default.body',
          defaultMessage:
            'You are on {currentVersion}. Upgrade to get the latest features and fixes.',
        },
        { currentVersion }
      );

  const closeLabel = isUrgent
    ? formatMessage({
        id: 'Settings.application.upgrade-banner.urgent.hide',
        defaultMessage: 'Hide for 7 days',
      })
    : formatMessage({
        id: 'Settings.application.upgrade-banner.default.hide',
        defaultMessage: 'Hide until the next version',
      });

  return (
    <Alert
      variant={isUrgent ? 'warning' : 'default'}
      title={title}
      closeLabel={closeLabel}
      onClose={handleClose}
      action={
        <AlertActions gap={2} wrap="wrap">
          <Button
            tag="a"
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="tertiary"
            endIcon={<ExternalLink />}
          >
            {formatMessage({
              id: 'Settings.application.upgrade-banner.release-notes',
              defaultMessage: 'Release notes',
            })}
          </Button>
          <Button
            tag="a"
            href={UPGRADE_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="default"
          >
            {formatMessage({
              id: 'Settings.application.upgrade-banner.upgrade-guide',
              defaultMessage: 'Upgrade guide',
            })}
          </Button>
        </AlertActions>
      }
    >
      {message}
    </Alert>
  );
};

export { UpgradeBanner, RELEASES_URL, UPGRADE_DOCS_URL };
