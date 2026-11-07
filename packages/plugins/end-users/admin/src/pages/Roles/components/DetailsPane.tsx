import * as React from 'react';

import { Box, Button, Flex, Loader, Typography } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetBoundRoutesQuery } from '../../../services/permissions';
import { getTranslation } from '../../../utils/getTranslation';
import { withOccurrenceKeys } from '../../../utils/withOccurrenceKeys';
import { ACTION_MESSAGES } from '../utils/actionLabels';

import type {
  BoundRoute,
  BoundRule,
  DataAction,
  LayoutContentType,
  LayoutRouteGroup,
  PermissionLayout,
  PermissionRow,
} from '../../../../../shared/contracts/permissions';
import type { PermissionsTabId } from '@strapi/admin/strapi-admin';

/** How many policies and middlewares a route lists before "Show N more" */
const RULES_SHOWN = 3;

/** The colours of the method badge: the admin's own, from read to remove */
const METHOD_COLORS: Record<string, 'secondary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  GET: 'secondary',
  POST: 'success',
  PUT: 'warning',
  DELETE: 'danger',
};

/** A setting of a rule as the server serves it, already redacted: `key: value` */
const describeConfig = (config: BoundRule['config']) =>
  Object.entries(config)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(', ');

/* -------------------------------------------------------------------------------------------------
 * Rules
 * -----------------------------------------------------------------------------------------------*/

interface RulesListProps {
  rules: BoundRule[];
}

/** The policies, then the middlewares, a route runs: the first three, then "Show N more" */
const RulesList = ({ rules }: RulesListProps) => {
  const { formatMessage } = useIntl();
  const [showAll, setShowAll] = React.useState(false);
  const shown = showAll ? rules : rules.slice(0, RULES_SHOWN);
  const hidden = rules.length - RULES_SHOWN;

  return (
    <Box tag="ul" background="neutral0" borderColor="neutral200" hasRadius>
      {withOccurrenceKeys(shown, ({ kind, name }) => `${kind}:${name}`).map(
        ([key, { kind, name, label, config }]) => {
          const kindLabel =
            kind === 'middleware'
              ? formatMessage({
                  id: getTranslation('roles.details.middleware'),
                  defaultMessage: 'Middleware',
                })
              : formatMessage({
                  id: getTranslation('roles.details.policy'),
                  defaultMessage: 'Policy',
                });
          const settings = describeConfig(config);

          return (
            <Flex
              // A route may run a rule twice: the key counts the repeats
              key={key}
              tag="li"
              justifyContent="space-between"
              alignItems="baseline"
              gap={3}
              paddingTop={2}
              paddingBottom={2}
              paddingLeft={3}
              paddingRight={3}
              title={`${kindLabel} · ${name}`}
            >
              <Typography variant="omega" textColor="neutral800">
                {label}
                {settings !== '' && (
                  <Typography variant="pi" textColor="neutral600">
                    {` ${settings}`}
                  </Typography>
                )}
              </Typography>
              <Typography variant="pi" textColor="neutral600" style={{ whiteSpace: 'nowrap' }}>
                {kindLabel}
              </Typography>
            </Flex>
          );
        }
      )}
      {hidden > 0 && (
        <Box tag="li" paddingTop={1} paddingBottom={1} paddingLeft={3} paddingRight={3}>
          <Button variant="ghost" size="S" onClick={() => setShowAll((current) => !current)}>
            {showAll
              ? formatMessage({
                  id: getTranslation('roles.details.show-fewer'),
                  defaultMessage: 'Show fewer',
                })
              : formatMessage(
                  {
                    id: getTranslation('roles.details.show-more'),
                    defaultMessage: 'Show {count} more',
                  },
                  { count: hidden }
                )}
          </Button>
        </Box>
      )}
    </Box>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ActionRow
 * -----------------------------------------------------------------------------------------------*/

interface ActionRowProps {
  label: string;
  granted: boolean;
  routes: BoundRoute[];
  hint?: string;
}

/** One action: what the role has of it, the routes it is bound to and what each of them runs */
const ActionRow = ({ label, granted, routes, hint }: ActionRowProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex
      role="group"
      aria-label={label}
      direction="column"
      alignItems="stretch"
      gap={2}
      marginTop={5}
    >
      <Flex justifyContent="space-between" gap={2}>
        <Typography variant="sigma" textColor="neutral600">
          {label}
        </Typography>
        <Typography
          variant="pi"
          fontWeight="bold"
          textColor={granted ? 'success600' : 'neutral600'}
        >
          {granted
            ? formatMessage({
                id: getTranslation('roles.details.granted'),
                defaultMessage: 'Granted',
              })
            : formatMessage({
                id: getTranslation('roles.details.not-granted'),
                defaultMessage: 'Not granted',
              })}
        </Typography>
      </Flex>
      {hint && (
        <Typography variant="pi" textColor="neutral600">
          {hint}
        </Typography>
      )}
      {withOccurrenceKeys(routes, ({ method, path }) => `${method} ${path}`).map(
        ([key, { method, path, rules }]) => {
          const color = METHOD_COLORS[method] ?? 'neutral';

          return (
            // A route that runs rules has them attached under its box
            <Flex key={key} direction="column" alignItems="stretch" gap={0}>
              <Flex background="neutral0" borderColor="neutral200" hasRadius alignItems="stretch">
                <Flex
                  justifyContent="center"
                  alignItems="center"
                  padding={2}
                  minWidth="64px"
                  background={`${color}100`}
                  borderColor={`${color}200`}
                  hasRadius
                >
                  <Typography variant="omega" fontWeight="bold" textColor={`${color}600`}>
                    {method}
                  </Typography>
                </Flex>
                <Box padding={2} minWidth={0}>
                  <Typography
                    variant="omega"
                    textColor="neutral800"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {path}
                  </Typography>
                </Box>
              </Flex>
              {rules.length > 0 && <RulesList rules={rules} />}
            </Flex>
          );
        }
      )}
    </Flex>
  );
};

/* -------------------------------------------------------------------------------------------------
 * DetailsPane
 * -----------------------------------------------------------------------------------------------*/

interface DetailsPaneProps {
  /** What the editor has open: a content type, or a plugin or a group of custom routes */
  open: { tab: PermissionsTabId; id: string };
  layout: PermissionLayout;
  /** What the role is granted as it is being edited: its rows as they are stored */
  rows: PermissionRow[];
}

/**
 * What the open row of the editor holds under its fields: the routes bound to it, with what the role
 * is granted on each and the policies and middlewares each route runs. A rule's settings are shown
 * as the server gives them, which has already left out the secret ones.
 */
const DetailsPane = ({ open, layout, rows }: DetailsPaneProps) => {
  const { formatMessage } = useIntl();

  const contentType: LayoutContentType | undefined =
    open.tab === 'collectionTypes' || open.tab === 'singleTypes'
      ? layout.contentTypes.find(({ uid }) => uid === open.id)
      : undefined;
  const group: LayoutRouteGroup | undefined =
    open.tab === 'plugins' || open.tab === 'settings'
      ? layout.groups.find(({ id }) => id === open.id)
      : undefined;
  const subject = contentType?.uid ?? group?.id;

  const {
    data: routes = [],
    isLoading,
    isError,
  } = useGetBoundRoutesQuery(subject ?? '', {
    skip: subject === undefined,
  });

  const isGranted = (actionId: string) => rows.some(({ action }) => action === actionId);
  const routesOf = (actionId: string) => routes.filter((route) => route.actionId === actionId);

  // Something the layout doesn't know has no routes to show
  if (subject === undefined) {
    return null;
  }

  const name = contentType?.label ?? group?.label ?? subject;
  const draftsHint =
    contentType?.kind === 'singleType'
      ? formatMessage({
          id: getTranslation('roles.details.drafts.single'),
          defaultMessage: 'Lets Find return drafts.',
        })
      : formatMessage({
          id: getTranslation('roles.details.drafts'),
          defaultMessage: 'Lets Find and Find one return drafts.',
        });

  return (
    <Box>
      <Typography tag="h2" variant="delta" style={{ overflowWrap: 'anywhere' }}>
        {formatMessage(
          {
            id: getTranslation('roles.details.routes-of'),
            defaultMessage: 'Routes bound to <highlight>{name}</highlight>',
          },
          {
            name,
            highlight: (chunks: React.ReactNode) => (
              <Typography tag="span" variant="delta" textColor="primary600">
                {chunks}
              </Typography>
            ),
          }
        )}
      </Typography>
      {isLoading && (
        <Box paddingTop={4}>
          <Loader small>
            {formatMessage({
              id: getTranslation('roles.details.loading'),
              defaultMessage: 'Loading the routes',
            })}
          </Loader>
        </Box>
      )}
      {isError && (
        <Box paddingTop={4}>
          <Typography textColor="danger600">
            {formatMessage({
              id: getTranslation('roles.details.error'),
              defaultMessage: 'The routes could not be loaded.',
            })}
          </Typography>
        </Box>
      )}
      {contentType?.actions.map(({ action, actionId }) => (
        <ActionRow
          key={actionId}
          label={formatMessage(ACTION_MESSAGES[action as DataAction])}
          granted={isGranted(actionId)}
          routes={routesOf(actionId)}
          hint={action === 'read-drafts' ? draftsHint : undefined}
        />
      ))}
      {group?.categories.map(({ label, routes: categoryRoutes }) => (
        <Box key={label}>
          {group.categories.length > 1 && (
            <Box
              marginTop={7}
              paddingBottom={1}
              borderColor="neutral200"
              style={{ borderWidth: '0 0 1px' }}
            >
              <Typography variant="sigma" textColor="neutral600">
                {label}
              </Typography>
            </Box>
          )}
          {categoryRoutes.map((route) => (
            <ActionRow
              key={route.actionId}
              label={route.label}
              granted={isGranted(route.actionId)}
              routes={routesOf(route.actionId)}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
};

export { DetailsPane };
export type { DetailsPaneProps };
