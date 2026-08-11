import * as React from 'react';

import { Box, Button, Flex, Grid, Typography } from '@strapi/design-system';
import { Book, ExternalLink, PaperPlane } from '@strapi/icons';
import { Discord, GitHub } from '@strapi/icons/symbols';
import { useIntl, type MessageDescriptor } from 'react-intl';
import { styled } from 'styled-components';

import { getProjectType } from '../../../../../../../shared/utils/get-project-type';
import { useTypedSelector } from '../../../../../core/store/hooks';
import { useRBAC } from '../../../../../hooks/useRBAC';
import { useGetLicenseLimitsQuery } from '../../../../../services/admin';

import { DiagnosticSnapshotModal } from './DiagnosticSnapshotModal';

/* -------------------------------------------------------------------------------------------------
 * SupportLinkTile
 * -----------------------------------------------------------------------------------------------*/

interface SupportLinkTileConfig {
  id: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: MessageDescriptor;
  description: MessageDescriptor;
}

/**
 * Tints every tile icon with the same brand-neutral colour, including the GitHub and Discord
 * marks. Those two are single-path glyphs carrying a hardcoded brand fill (`#24292F`, `#5865F2`),
 * and a `fill` prop only reaches the `<svg>`, which the path's own attribute overrides — but a CSS
 * declaration outranks that presentation attribute, so this wins for all icons uniformly.
 */
const TileIcon = styled.span`
  display: inline-flex;

  svg,
  svg path {
    fill: ${({ theme }) => theme.colors.primary600};
  }
`;

const SupportLinkTile = ({ href, icon: Icon, title, description }: SupportLinkTileConfig) => {
  const { formatMessage } = useIntl();

  return (
    <Box
      tag="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // Without this the accessible name is the title and description concatenated, so the tile
      // announces as e.g. "Documentation Guides and API reference" and collides with the
      // same-named Settings nav link. Labelling it also tells screen readers it opens a new tab.
      aria-label={formatMessage(
        {
          id: 'Settings.application.support.tile-label',
          defaultMessage: 'Open {title} in a new tab',
        },
        { title: formatMessage(title) }
      )}
      display="block"
      hasRadius
      background="neutral100"
      borderColor="neutral200"
      padding={4}
      // The tile is the link, so the anchor's own underline and link colour must not bleed onto
      // the text inside it; every colour below comes from a theme token so both themes match.
      style={{ textDecoration: 'none' }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <TileIcon>
          <Icon width="2rem" height="2rem" aria-hidden />
        </TileIcon>
        <ExternalLink fill="neutral400" aria-hidden />
      </Flex>
      <Flex direction="column" alignItems="start" gap={1} paddingTop={3}>
        <Typography fontWeight="bold" textColor="neutral800">
          {formatMessage(title)}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {formatMessage(description)}
        </Typography>
      </Flex>
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SupportCard
 * -----------------------------------------------------------------------------------------------*/

const DOCUMENTATION_TILE: SupportLinkTileConfig = {
  id: 'documentation',
  href: 'https://docs.strapi.io',
  icon: Book,
  title: {
    id: 'Settings.application.support.documentation.title',
    defaultMessage: 'Documentation',
  },
  description: {
    id: 'Settings.application.support.documentation.description',
    defaultMessage: 'Guides and API reference',
  },
};

const GITHUB_ISSUES_TILE: SupportLinkTileConfig = {
  id: 'github-issues',
  href: 'https://github.com/strapi/strapi/issues',
  icon: GitHub,
  title: {
    id: 'Settings.application.support.github-issues.title',
    defaultMessage: 'GitHub issues',
  },
  description: {
    id: 'Settings.application.support.github-issues.description',
    defaultMessage: 'Report a bug',
  },
};

const GITHUB_DISCUSSIONS_TILE: SupportLinkTileConfig = {
  id: 'github-discussions',
  href: 'https://github.com/strapi/strapi/discussions',
  icon: GitHub,
  title: {
    id: 'Settings.application.support.github-discussions.title',
    defaultMessage: 'GitHub discussions',
  },
  description: {
    id: 'Settings.application.support.github-discussions.description',
    defaultMessage: 'Ask a question or propose an idea',
  },
};

const DISCORD_TILE: SupportLinkTileConfig = {
  id: 'discord',
  href: 'https://discord.strapi.io',
  icon: Discord,
  title: { id: 'Settings.application.support.discord.title', defaultMessage: 'Discord' },
  description: {
    id: 'Settings.application.support.discord.description',
    defaultMessage: 'Talk to the community in real time',
  },
};

const SUPPORT_PORTAL_TILE: SupportLinkTileConfig = {
  id: 'support-portal',
  href: 'https://support.strapi.io',
  icon: PaperPlane,
  title: {
    id: 'Settings.application.support.support-portal.title',
    defaultMessage: 'Support portal',
  },
  description: {
    id: 'Settings.application.support.support-portal.description',
    defaultMessage: 'Open a ticket with the Strapi support',
  },
};

const CE_TILES: SupportLinkTileConfig[] = [
  DOCUMENTATION_TILE,
  GITHUB_ISSUES_TILE,
  GITHUB_DISCUSSIONS_TILE,
  DISCORD_TILE,
];

const EE_TILES: SupportLinkTileConfig[] = [
  SUPPORT_PORTAL_TILE,
  DOCUMENTATION_TILE,
  GITHUB_ISSUES_TILE,
  DISCORD_TILE,
];

const SupportCard = () => {
  const { formatMessage } = useIntl();
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = React.useState(false);

  const debugDumpPermissions = useTypedSelector(
    (state) => state.admin_app.permissions.settings?.['debug-dump']?.main
  );
  const {
    allowedActions: { canRead },
  } = useRBAC(debugDumpPermissions);

  // Keyed on the licensed plan rather than `isEE` so a customer whose license has lapsed keeps
  // the Strapi support portal link, which is exactly what they need at that moment. This only
  // ever swaps which support links are shown; it gates no feature.
  // The authenticated license-limit-information endpoint is EE-only, so a CE instance gets a
  // 404 here; treat that (or any other error/missing data) the same as "no license" (Community).
  const { data: licenseLimitsData } = useGetLicenseLimitsQuery();
  const licenseStatus = licenseLimitsData?.data?.licenseStatus ?? 'none';
  const planPriceId = licenseLimitsData?.data?.planPriceId ?? undefined;
  const licensedPlan = getProjectType({ isEE: licenseStatus !== 'none', planPriceId });
  const isPaidPlan = licensedPlan !== 'Community';
  const tiles = isPaidPlan ? EE_TILES : CE_TILES;

  return (
    <>
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
        <Flex direction="column" alignItems="start" gap={1}>
          <Typography variant="delta" tag="h3">
            {formatMessage({ id: 'Settings.application.support.title', defaultMessage: 'Support' })}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage(
              isPaidPlan
                ? {
                    id: 'Settings.application.support.subtitle.enterprise',
                    defaultMessage:
                      'Contact support, report a bug, or contribute to the Strapi community.',
                  }
                : {
                    id: 'Settings.application.support.subtitle.community',
                    defaultMessage:
                      'Ask a question, report a bug, or contribute to the Strapi community.',
                  }
            )}
          </Typography>
        </Flex>
        <Flex alignItems="stretch" gap={7}>
          <Box flex="1 1 0%">
            <Grid.Root gap={4}>
              {tiles.map((tile) => (
                <Grid.Item key={tile.id} col={6} xs={12} direction="column" alignItems="stretch">
                  <SupportLinkTile {...tile} />
                </Grid.Item>
              ))}
            </Grid.Root>
          </Box>
          {canRead && (
            <>
              <Box background="neutral150" width="0.1rem" />
              <Flex direction="column" alignItems="start" gap={3} flex="1 1 0%">
                <Typography variant="sigma" textColor="neutral600">
                  {formatMessage({
                    id: 'Settings.application.support.diagnostic-snapshot.label',
                    defaultMessage: 'diagnostic snapshot',
                  })}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {formatMessage(
                    isPaidPlan
                      ? {
                          id: 'Settings.application.support.diagnostic-snapshot.description.enterprise',
                          defaultMessage:
                            'Reporting a bug? A diagnostic snapshot describes how this project is built so it can be reproduced.',
                        }
                      : {
                          id: 'Settings.application.support.diagnostic-snapshot.description.community',
                          defaultMessage:
                            "Reporting a bug? Generate a snapshot of your app's structure so the issue can be reproduced.",
                        }
                  )}
                </Typography>
                <Button onClick={() => setIsSnapshotModalOpen(true)}>
                  {formatMessage({
                    id: 'Settings.application.support.diagnostic-snapshot.generate',
                    defaultMessage: 'Generate snapshot',
                  })}
                </Button>
              </Flex>
            </>
          )}
        </Flex>
      </Flex>
      <DiagnosticSnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
      />
    </>
  );
};

export { SupportCard };
