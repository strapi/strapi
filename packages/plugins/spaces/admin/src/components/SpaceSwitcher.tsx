import * as React from 'react';

import { useRBAC } from '@strapi/admin/strapi-admin';
import { Box, Flex, Menu, Typography, VisuallyHidden } from '@strapi/design-system';
import { Check, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { PERMISSIONS } from '../constants';
import { useGetMineSpacesQuery } from '../services/spaces';
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { useSwitchWorkspace } from '../utils/useSwitchWorkspace';

/* Mirrors NavUser's trigger so the switcher sits naturally above the avatar. */
const MenuTrigger = styled(Menu.Trigger)`
  padding: 0;

  ${({ theme }) => theme.breakpoints.large} {
    width: 4rem;
    height: 4rem;
    justify-content: center;
  }
`;

const SpaceBubble = styled(Flex)<{ $color: string | null }>`
  height: ${({ theme }) => theme.spaces[7]};
  width: ${({ theme }) => theme.spaces[7]};
  border: none;
  border-radius: 50%;
  overflow: hidden;
  background: ${({ $color, theme }) => $color ?? theme.colors.neutral200};
`;

const MenuContent = styled(Menu.Content)`
  max-height: fit-content;
  width: 220px;
`;

const Heading = styled(Flex)`
  && {
    padding: ${({ theme }) => theme.spaces[3]};
  }
`;

const Dot = ({ color }: { color: string | null }) => (
  <Box
    width="10px"
    height="10px"
    borderRadius="50%"
    background={color ?? 'neutral300'}
    shrink={0}
  />
);

/**
 * Workspace switcher living at the bottom of the main navigation, right above
 * the user avatar (mounted via `registerMainNavAddon`). An admin is ALWAYS in
 * exactly one workspace — there is no "all workspaces" mode — so the trigger is
 * the active workspace's colored bubble/initial, and the menu offers the other
 * workspaces plus an "Add a workspace" entry (RBAC-gated).
 *
 * Switching is a pure data swap — no page reload: the slug is persisted, the
 * RTK caches are reset and every mounted screen refetches under the new
 * workspace (see useSwitchWorkspace).
 *
 * Self-healing: when the stored slug no longer matches an active workspace
 * (archived, renamed install), we silently switch to the first active one.
 * `/spaces/*` requests are exempt from the header interceptor, so this
 * component keeps receiving data even while the stored slug is stale.
 */
export const SpaceSwitcher = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { data: spaces } = useGetMineSpacesQuery();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const switchWorkspace = useSwitchWorkspace();

  const currentSlug = getCurrentSpaceSlug();
  const current = spaces?.find((s) => s.slug === currentSlug) ?? null;

  React.useEffect(() => {
    if (!spaces || spaces.length === 0) {
      return;
    }
    if (!spaces.some((s) => s.slug === currentSlug)) {
      switchWorkspace(spaces[0].slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces, currentSlug]);

  // Nav accent: the active workspace's color rises from the bottom of the main
  // navigation (gradient consumed by the admin's MainNav via
  // --strapi-workspace-color; unset = no accent).
  const currentColor = spaces?.find((s) => s.slug === currentSlug)?.color ?? null;
  React.useEffect(() => {
    if (currentColor) {
      document.documentElement.style.setProperty('--strapi-workspace-color', currentColor);
    } else {
      document.documentElement.style.removeProperty('--strapi-workspace-color');
    }
    return () => {
      document.documentElement.style.removeProperty('--strapi-workspace-color');
    };
  }, [currentColor]);

  if (!spaces || spaces.length === 0 || !current) {
    return null;
  }

  const handleSelect = (slug: string) => {
    if (slug === current.slug) {
      return;
    }
    switchWorkspace(slug);
  };

  return (
    <Flex>
      <Menu.Root>
        <MenuTrigger endIcon={null} fullWidth justifyContent="center">
          <SpaceBubble $color={current.color} justifyContent="center" alignItems="center">
            <Typography fontWeight="bold" textColor="neutral0">
              {current.name.slice(0, 1).toUpperCase()}
            </Typography>
          </SpaceBubble>
          <VisuallyHidden tag="span">
            {formatMessage(
              {
                id: getTranslation('switcher.triggerLabel'),
                defaultMessage: 'Current workspace: {name}. Click to switch.',
              },
              { name: current.name }
            )}
          </VisuallyHidden>
        </MenuTrigger>

        <MenuContent popoverPlacement="top-start" zIndex={3}>
          <Heading>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslation('switcher.heading'),
                defaultMessage: 'Switch workspace',
              })}
            </Typography>
          </Heading>

          {spaces.map((space) => {
            // The default workspace stays identifiable even once renamed:
            // "Main (default)". Skipped when the name is literally "Default".
            const showDefaultSuffix =
              space.slug === DEFAULT_SPACE_SLUG && space.name.toLowerCase() !== 'default';

            return (
              <Menu.Item key={space.slug} onSelect={() => handleSelect(space.slug)}>
                <Flex alignItems="center" gap={2} width="100%" justifyContent="space-between">
                  <Flex alignItems="center" gap={2}>
                    <Dot color={space.color} />
                    <Typography>{space.name}</Typography>
                    {showDefaultSuffix && (
                      <Typography textColor="neutral500" variant="pi">
                        {formatMessage({
                          id: getTranslation('switcher.defaultSuffix'),
                          defaultMessage: '(default)',
                        })}
                      </Typography>
                    )}
                  </Flex>
                  {current.slug === space.slug && <Check fill="primary600" />}
                </Flex>
              </Menu.Item>
            );
          })}

          {allowedActions.canCreate && (
            <>
              <Menu.Separator />
              <Menu.Item onSelect={() => navigate('/settings/workspaces/create')}>
                <Flex alignItems="center" gap={2}>
                  <Plus fill="neutral500" />
                  <Typography>
                    {formatMessage({
                      id: getTranslation('switcher.addWorkspace'),
                      defaultMessage: 'Add a workspace',
                    })}
                  </Typography>
                </Flex>
              </Menu.Item>
            </>
          )}
        </MenuContent>
      </Menu.Root>
    </Flex>
  );
};
