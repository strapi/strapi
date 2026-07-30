import type * as React from 'react';

import { Box, Field, Flex, Grid, Toggle, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { DEFAULT_CAPABILITIES, type SpaceCapabilities } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';

interface CapabilityEntry {
  key: keyof SpaceCapabilities;
  id: string;
  defaultMessage: string;
}

const CAPABILITY_GROUPS: Array<{
  id: string;
  defaultMessage: string;
  entries: CapabilityEntry[];
}> = [
  {
    id: 'settings.capabilities.group.sections',
    defaultMessage: 'Settings sections',
    entries: [
      { key: 'apiTokens', id: 'settings.capabilities.apiTokens', defaultMessage: 'API Tokens' },
      {
        key: 'transferTokens',
        id: 'settings.capabilities.transferTokens',
        defaultMessage: 'Transfer Tokens',
      },
      { key: 'webhooks', id: 'settings.capabilities.webhooks', defaultMessage: 'Webhooks' },
      { key: 'users', id: 'settings.capabilities.users', defaultMessage: 'Users' },
      { key: 'roles', id: 'settings.capabilities.roles', defaultMessage: 'Roles' },
      {
        key: 'internationalization',
        id: 'settings.capabilities.internationalization',
        defaultMessage: 'Internationalization',
      },
      {
        key: 'mediaLibrarySettings',
        id: 'settings.capabilities.mediaLibrarySettings',
        defaultMessage: 'Media Library settings',
      },
    ],
  },
  {
    id: 'settings.capabilities.group.content',
    defaultMessage: 'Content',
    entries: [
      { key: 'publish', id: 'settings.capabilities.publish', defaultMessage: 'Publishing' },
      {
        key: 'moveEntries',
        id: 'settings.capabilities.moveEntries',
        defaultMessage: 'Move entries',
      },
      { key: 'upload', id: 'settings.capabilities.upload', defaultMessage: 'Media upload' },
      {
        key: 'contentApi',
        id: 'settings.capabilities.contentApi',
        defaultMessage: 'Content API',
      },
    ],
  },
];

interface CapabilitiesCardProps {
  value: SpaceCapabilities;
  onChange: (next: SpaceCapabilities) => void;
  disabled?: boolean;
}

/**
 * Per-workspace capabilities: which Settings sections this workspace may see
 * and manage, and which content behaviors are allowed there (publishing,
 * moving entries, uploading media, being served by the content API). The
 * default workspace ignores this — it always sees everything, everywhere — so
 * the card is only rendered for other workspaces. The Content-Type Builder
 * isn't listed: it's a hard rule, default workspace only.
 */
export const CapabilitiesCard = ({ value, onChange, disabled = false }: CapabilitiesCardProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
      <Flex direction="column" alignItems="stretch" gap={5}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography variant="delta" tag="h2">
            {formatMessage({
              id: getTranslation('settings.capabilities.title'),
              defaultMessage: 'Capabilities',
            })}
          </Typography>
          <Typography variant="pi" textColor="neutral600">
            {formatMessage({
              id: getTranslation('settings.capabilities.hint'),
              defaultMessage:
                'What this workspace can see and do. Disabled Settings sections disappear there; content behaviors are enforced server-side. The Default workspace always sees everything.',
            })}
          </Typography>
        </Flex>

        {CAPABILITY_GROUPS.map((group) => (
          <Flex key={group.id} direction="column" alignItems="stretch" gap={3}>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslation(group.id),
                defaultMessage: group.defaultMessage,
              })}
            </Typography>
            <Grid.Root gap={4}>
              {group.entries.map(({ key, id, defaultMessage }) => (
                <Grid.Item key={key} col={3} s={6} xs={12} direction="column" alignItems="stretch">
                  {/* Same Field.Root + Toggle composition as the i18n settings
                      page — the segmented control needs its natural width to
                      lay its two labels side by side. */}
                  <Field.Root name={`capability-${key}`} minWidth="200px">
                    <Field.Label>
                      {formatMessage({ id: getTranslation(id), defaultMessage })}
                    </Field.Label>
                    <Toggle
                      checked={value[key] ?? DEFAULT_CAPABILITIES[key]}
                      disabled={disabled}
                      onLabel={formatMessage({
                        id: 'app.components.ToggleCheckbox.enabled-label',
                        defaultMessage: 'Enabled',
                      })}
                      offLabel={formatMessage({
                        id: 'app.components.ToggleCheckbox.disabled-label',
                        defaultMessage: 'Disabled',
                      })}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onChange({ ...DEFAULT_CAPABILITIES, ...value, [key]: e.target.checked })
                      }
                    />
                  </Field.Root>
                </Grid.Item>
              ))}
            </Grid.Root>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
};
