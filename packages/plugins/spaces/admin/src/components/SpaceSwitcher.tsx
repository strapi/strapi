import * as React from 'react';

import { useAuth, useRBAC } from '@strapi/admin/strapi-admin';
import { Box, Flex, Menu, Tooltip, Typography, VisuallyHidden } from '@strapi/design-system';
import { Check, Lock, Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { matchPath, useLocation, useNavigate } from 'react-router-dom';
import { styled } from 'styled-components';

import { PERMISSIONS } from '../constants';
import { useGetCurrentSpaceQuery, useGetMineSpacesQuery } from '../services/spaces';
import {
  DEFAULT_SPACE_SLUG,
  getCurrentSpaceSlug,
  getStoredSpaceOwner,
  getStoredSpaceSlug,
  useCurrentSpaceSlug,
} from '../utils/currentSpace';
import { getTranslation } from '../utils/getTranslation';
import { setKnownSpaces } from '../utils/knownSpaces';
import { useSpaceLimits } from '../utils/useSpaceLimits';
import { useSwitchWorkspace } from '../utils/useSwitchWorkspace';
import { stripWorkspaceFilters } from '../utils/workspaceFilters';

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

/**
 * Set once the switcher has reloaded to recover from a dead stored slug, so a
 * pathological answer from the server can never turn into a reload loop. Kept
 * in `sessionStorage` rather than a module variable, which the reload it
 * triggers would reset: where storage accepts a write and drops it again, the
 * healed slug does not survive the reload and the module flag would not either.
 */
const HEALED_KEY = 'strapi-spaces:healed-stored-slug';

const hasHealedStoredSlug = (): boolean => {
  try {
    return window.sessionStorage.getItem(HEALED_KEY) === '1';
  } catch {
    // No session storage: one reload is still better than a screen that never
    // recovers, and the slug write below is what normally stops the loop.
    return false;
  }
};

const markHealedStoredSlug = (): void => {
  try {
    window.sessionStorage.setItem(HEALED_KEY, '1');
  } catch {
    // Ignored, as above.
  }
};

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
  const { pathname, search } = useLocation();
  const { data: spaces } = useGetMineSpacesQuery();
  const { allowedActions } = useRBAC(PERMISSIONS);
  const switchWorkspace = useSwitchWorkspace();
  const { isAtLimit } = useSpaceLimits();

  /**
   * Subscribed, not read once: the switcher shows the active workspace, and the
   * active workspace is stored outside React. Reading it at render time made
   * the trigger depend on some *other* state change happening to re-render the
   * component — which is fine until the change is the switcher's own healing of
   * a dead slug, and it renders nothing at all.
   */
  const currentSlug = useCurrentSpaceSlug();
  const current = spaces?.find((s) => s.slug === currentSlug) ?? null;

  /**
   * Nothing usable stored on this browser: ask the server where *this admin*
   * was last. "Usable" is two conditions, not one — the slug must still name a
   * workspace they belong to, and it must be theirs. A slug left behind by
   * another admin on the same browser names a real workspace and would
   * otherwise sail through, landing the new admin wherever their colleague was
   * working instead of where they themselves left off.
   */
  const userId = useAuth('SpaceSwitcher', (state) => state.user?.id);
  /**
   * Nothing here runs without a session. The workspace list survives a logout in
   * the RTK cache — the page is never reloaded — so the switcher would otherwise
   * carry on hydrating on the login screen: picking a workspace for nobody,
   * writing it to this browser and posting it to an endpoint that answers 401.
   * The next admin to sign in would then find that workspace already "stored"
   * and never be asked where they left off.
   */
  const token = useAuth('SpaceSwitcher', (state) => state.token);
  const storedSlug = getStoredSpaceSlug();
  const storedOwner = getStoredSpaceOwner();
  const slugExists = Boolean(spaces?.some((s) => s.slug === storedSlug));
  const hasValidStoredSlug = slugExists && (storedOwner === null || storedOwner === String(userId));
  /**
   * Whose slug it is cannot be decided before the admin's identity has loaded,
   * and guessing costs more than waiting: hydrating on the assumption that it
   * belongs to someone else would switch them out of their own workspace.
   *
   * Only ever waits on a slug that still names a workspace they belong to. A
   * slug naming none is dead whoever stored it, and waiting there would
   * deadlock: the requests that would load the identity are the same ones the
   * dead workspace header is getting refused.
   */
  const identityPending = slugExists && storedOwner !== null && userId === undefined;
  /**
   * A session, or a workspace to heal.
   *
   * The session check keeps the switcher quiet on the login screen: the
   * workspace list survives a logout in the RTK cache, and hydrating there
   * would pick a workspace for nobody, store it in this browser, and leave the
   * next admin to sign in with a slug they never chose.
   *
   * It cannot be the only condition, though. When the stored workspace no
   * longer exists every request carrying it is refused, `/admin/users/me`
   * included, so there is no token to see — the one moment healing matters most
   * is the one moment a session cannot be proven. A dead slug is worth healing
   * for whoever comes next.
   */
  const hasSession = Boolean(token);
  const shouldHydrate =
    (hasSession || !slugExists) &&
    (spaces?.length ?? 0) > 0 &&
    !hasValidStoredSlug &&
    !identityPending;

  // Asked through the query rather than by hand: the request goes out as the
  // component renders, and under a dead workspace the admin around it
  // re-renders hard enough that an effect is not a reliable place to start one
  // from. The endpoint keeps nothing once hydration stops asking, so the answer
  // is never the previous session's.
  const lastUsedQuery = useGetCurrentSpaceQuery(undefined, {
    skip: !shouldHydrate,
    refetchOnMountOrArgChange: true,
  });
  const lastUsed = lastUsedQuery.data;
  const lastUsedSettled =
    (lastUsedQuery.isSuccess || lastUsedQuery.isError) && !lastUsedQuery.isFetching;

  // Mirror the list for the non-React code paths (list-view hook waterfalls).
  React.useEffect(() => {
    setKnownSpaces(spaces ?? []);
  }, [spaces]);

  /**
   * Hydration is a decision taken once per session, not a standing rule.
   *
   * Switching workspace invalidates the caches, which refetches the workspace
   * list, which hands this effect a new array — so an effect that re-decides
   * whenever its inputs change re-decides after its own switch, forever. The
   * session's token is the key: a different admin signing in on this page is a
   * new session and gets its own hydration.
   */
  const hydratedFor = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!shouldHydrate || !lastUsedSettled || !spaces?.length || hydratedFor.current === token) {
      return;
    }
    hydratedFor.current = token ?? null;

    {
      // Hydration order: the server's last-used workspace, else the first one
      // the user belongs to. Also heals a stale slug (archived, membership lost).
      const target = (spaces.find((s) => s.slug === lastUsed?.slug) ?? spaces[0]).slug;
      // Reset, not invalidate, when we are moving away from a workspace the
      // requests already went out with: those were refused (400 for a workspace
      // that no longer exists, 403 for one the user does not belong to), and a
      // rejected query provides no tags for invalidation to reach — the screen
      // would stay empty behind the healed switcher. Landing on the same
      // workspace we were already using needs no reset.
      switchWorkspace(target, { reset: getCurrentSpaceSlug() !== target });

      /**
       * Healing a *stored* slug is the one case that reloads the page.
       *
       * By the time the workspace list comes back, the screen behind the
       * switcher has already fired its requests under the dead slug and been
       * refused, and resetting the cache mid-flight does not reliably bring
       * every one of them back — a query cancelled by the reset can be left
       * with no subscriber and never asked again, which shows as a blank page
       * under a healed switcher. This costs one reload the first time an admin
       * returns to a workspace that was deleted or archived under them, and
       * nothing at all otherwise: an ordinary switch stays a data swap, and a
       * first visit with nothing stored does not come through here. Conditioned
       * on the new slug having actually been stored: where storage refuses
       * writes, reloading would land on the same dead slug and do it again. A
       * slug that still names a real workspace and merely belonged to another
       * admin does not qualify — the requests made under it were answered, so
       * an ordinary swap is enough.
       */
      if (
        storedSlug !== null &&
        !slugExists &&
        getStoredSpaceSlug() === target &&
        !hasHealedStoredSlug()
      ) {
        markHealedStoredSlug();
        window.location.reload();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaces, shouldHydrate, lastUsedSettled, lastUsed?.slug]);

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

  /**
   * A user who belongs to no workspace at all — every role they hold bound to
   * workspaces that were archived, say. The admin around them answers 403 to
   * everything, so the switcher says why rather than leaving an empty screen
   * with no explanation.
   */
  if (spaces && spaces.length === 0) {
    const hint = formatMessage({
      id: getTranslation('switcher.noWorkspace.hint'),
      defaultMessage:
        'No workspace: you do not belong to any. Ask an administrator to add you to one.',
    });

    return (
      <Flex padding={2}>
        <Tooltip label={hint}>
          <SpaceBubble $color={null} justifyContent="center" alignItems="center">
            <Lock fill="neutral600" />
            {/* The tooltip only speaks on hover, and this is the one screen
                element that explains why nothing else works. */}
            <VisuallyHidden tag="span">{hint}</VisuallyHidden>
          </SpaceBubble>
        </Tooltip>
      </Flex>
    );
  }

  if (!spaces || !current) {
    return null;
  }

  const handleSelect = (slug: string) => {
    if (slug === current.slug) {
      return;
    }
    switchWorkspace(slug);
    // The edit view's RBAC (the read-only lock) is evaluated when the view
    // mounts, not on a workspace change: leave the document for its list.
    const editView = matchPath(
      { path: '/content-manager/collection-types/:model/:id', end: false },
      pathname
    );
    if (editView?.params.model) {
      navigate(`/content-manager/collection-types/${editView.params.model}`);
      return;
    }
    // A "Workspace" filter belongs to the default workspace's superset view and
    // is not offered anywhere else, so carrying it into the new workspace would
    // empty the list with no chip to remove it (see stripWorkspaceFilters).
    const cleanedSearch = stripWorkspaceFilters(search);
    if (cleanedSearch !== null) {
      navigate(`${pathname}${cleanedSearch}`, { replace: true });
    }
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

          {allowedActions.canCreate && !isAtLimit && (
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
