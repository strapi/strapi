import * as React from 'react';

import {
  Alert,
  Box,
  Flex,
  Loader,
  Modal,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { DATA_ACTIONS } from '../../../../shared/contracts/permissions';
import { summarize } from '../../pages/Conditions/utils/summarize';
import { ACTION_MESSAGES } from '../../pages/Roles/utils/actionLabels';
import { useGetBuilderLayoutQuery, useGetConditionsQuery } from '../../services/conditions';
import { useGetEffectivePermissionsQuery } from '../../services/effectivePermissions';
import { useGetPermissionLayoutQuery } from '../../services/permissions';
import { useLazyGetRoleQuery } from '../../services/roles';
import { getTranslation } from '../../utils/getTranslation';

import type { ConditionListItem, BuilderLayout } from '../../../../shared/contracts/conditions';
import type { DataAction, PermissionRow } from '../../../../shared/contracts/permissions';
import type { EffectivePermissionsRole } from '../../../../shared/contracts/user-security';

/**
 * What each of the roles a user holds grants, by the action it names. Each role is read on its own
 * (one request per role, all at once): the user's own answer combines the roles, so it can't say
 * which one a grant comes from. The roles are read fresh each time the modal opens, never from the
 * cache, so what is read now is what is shown now. A role that can't be read counts as granting
 * nothing, so it is not named as the source of any grant.
 */
const useRoleRows = (roles: EffectivePermissionsRole[] | undefined) => {
  const [loadRole] = useLazyGetRoleQuery();
  const [rowsByRole, setRowsByRole] = React.useState<Record<string, PermissionRow[]>>({});

  React.useEffect(() => {
    let cancelled = false;

    Promise.all(
      (roles ?? []).map(async ({ documentId }) => {
        const { data } = await loadRole(documentId, false);

        return [documentId, data?.permissions ?? []] as const;
      })
    ).then((loaded) => {
      if (!cancelled) {
        setRowsByRole(Object.fromEntries(loaded));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [roles, loadRole]);

  return rowsByRole;
};

interface ConditionLineProps {
  name: string;
  conditions: Map<string, ConditionListItem>;
  builderLayout: BuilderLayout | undefined;
}

/** A condition by its name, and for a builder condition what it says in plain English */
const ConditionLine = ({ name, conditions, builderLayout }: ConditionLineProps) => {
  const { formatMessage } = useIntl();
  const condition = conditions.get(name);

  if (!condition) {
    return <Typography variant="omega">{name}</Typography>;
  }

  const sentences =
    condition.builder && builderLayout
      ? summarize(condition.builder, builderLayout, (message, values) =>
          formatMessage(message, values)
        )
      : [];

  return (
    <Flex direction="column" alignItems="flex-start" gap={1}>
      <Typography variant="omega" fontWeight="bold">
        {condition.displayName}
      </Typography>
      {sentences.map((sentence) => (
        <Typography key={sentence} variant="pi" textColor="neutral600">
          {sentence}
        </Typography>
      ))}
    </Flex>
  );
};

const byActionOrder = (a: string, b: string) => {
  const rank = (action: string) => {
    const index = DATA_ACTIONS.indexOf(action as DataAction);

    return index === -1 ? DATA_ACTIONS.length : index;
  };

  return rank(a) - rank(b) || a.localeCompare(b);
};

const Content = ({ documentId }: { documentId: string }) => {
  const { formatMessage } = useIntl();
  const { data, isLoading, isError } = useGetEffectivePermissionsQuery(documentId);
  const { data: layout } = useGetPermissionLayoutQuery();
  const { data: conditionList } = useGetConditionsQuery();
  const { data: builderLayout } = useGetBuilderLayoutQuery();
  const rowsByRole = useRoleRows(data?.roles);

  const labels = React.useMemo(
    () => new Map((layout?.contentTypes ?? []).map(({ uid, label }) => [uid, label])),
    [layout]
  );
  const conditions = React.useMemo(
    () => new Map((conditionList ?? []).map((condition) => [condition.name, condition])),
    [conditionList]
  );

  if (isLoading) {
    return <Loader>{formatMessage({ id: 'app.utils.loading', defaultMessage: 'Loading' })}</Loader>;
  }

  if (isError || !data) {
    return (
      <Alert
        variant="danger"
        closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
      >
        {formatMessage({
          id: getTranslation('effective-permissions.error'),
          defaultMessage: "This user's permissions could not be read.",
        })}
      </Alert>
    );
  }

  /** The names of the roles whose rows grant the action, none for a role that could not be read */
  const rolesGranting = (uid: string, action: string) => {
    const granting = data.roles.filter(({ documentId: roleId }) =>
      (rowsByRole[roleId] ?? []).some((row) => row.action === `${uid}.${action}`)
    );

    return granting.map(({ name }) => name);
  };

  const subjects = Object.entries(data.subjects).sort(([a], [b]) =>
    (labels.get(a) ?? a).localeCompare(labels.get(b) ?? b)
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={6}>
      <Typography textColor="neutral600">
        {data.roles.length === 0
          ? formatMessage({
              id: getTranslation('effective-permissions.no-roles'),
              defaultMessage: 'This user holds no role.',
            })
          : formatMessage(
              {
                id: getTranslation('effective-permissions.roles'),
                defaultMessage:
                  '{count, plural, one {Role} other {Roles}}: {roles}. Several roles add up: a user holds what any of their roles grants.',
              },
              { count: data.roles.length, roles: data.roles.map(({ name }) => name).join(', ') }
            )}
      </Typography>
      {subjects.length === 0 && data.roles.length > 0 && (
        <Typography textColor="neutral600">
          {formatMessage({
            id: getTranslation('effective-permissions.none'),
            defaultMessage: 'No role of this user grants anything on a content type.',
          })}
        </Typography>
      )}
      {subjects.map(([uid, actions]) => {
        const label = labels.get(uid) ?? uid;

        return (
          <Box key={uid} tag="section" aria-label={label}>
            <Typography tag="h3" variant="delta" paddingBottom={2}>
              {label}
            </Typography>
            <Table colCount={5} rowCount={Object.keys(actions).length + 1}>
              <Thead>
                <Tr>
                  {[
                    {
                      id: getTranslation('effective-permissions.action'),
                      defaultMessage: 'Action',
                    },
                    {
                      id: getTranslation('effective-permissions.fields'),
                      defaultMessage: 'Fields',
                    },
                    {
                      id: getTranslation('effective-permissions.from'),
                      defaultMessage: 'From role',
                    },
                    {
                      id: getTranslation('effective-permissions.conditions'),
                      defaultMessage: 'Conditions',
                    },
                    {
                      id: getTranslation('effective-permissions.depth'),
                      defaultMessage: 'Populate depth',
                    },
                  ].map((header) => (
                    <Th key={header.id}>
                      <Typography variant="sigma" textColor="neutral600">
                        {formatMessage(header)}
                      </Typography>
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {Object.entries(actions)
                  .sort(([a], [b]) => byActionOrder(a, b))
                  .map(([action, held]) => {
                    const from = rolesGranting(uid, action);
                    const message = ACTION_MESSAGES[action as DataAction];

                    return (
                      <Tr key={action}>
                        <Td>
                          <Typography fontWeight="bold">
                            {message ? formatMessage(message) : action}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography>
                            {held.fields === null
                              ? formatMessage({
                                  id: getTranslation('effective-permissions.every-field'),
                                  defaultMessage: 'Every field',
                                })
                              : held.fields.length === 0
                                ? formatMessage({
                                    id: getTranslation('effective-permissions.no-field'),
                                    defaultMessage: 'No field',
                                  })
                                : held.fields.join(', ')}
                          </Typography>
                        </Td>
                        <Td>
                          <Typography>{from.length > 0 ? from.join(', ') : '-'}</Typography>
                        </Td>
                        <Td>
                          {held.conditions.length === 0 ? (
                            <Typography textColor="neutral600">
                              {formatMessage({
                                id: getTranslation('effective-permissions.unconditional'),
                                defaultMessage: 'Always',
                              })}
                            </Typography>
                          ) : (
                            <Flex direction="column" alignItems="flex-start" gap={2}>
                              {held.conditions.map((name) => (
                                <ConditionLine
                                  key={name}
                                  name={name}
                                  conditions={conditions}
                                  builderLayout={builderLayout}
                                />
                              ))}
                            </Flex>
                          )}
                        </Td>
                        <Td>
                          <Typography>
                            {held.populateDepth === null
                              ? formatMessage({
                                  id: getTranslation('effective-permissions.unlimited'),
                                  defaultMessage: 'Unlimited',
                                })
                              : held.populateDepth}
                          </Typography>
                        </Td>
                      </Tr>
                    );
                  })}
              </Tbody>
            </Table>
          </Box>
        );
      })}
    </Flex>
  );
};

interface EffectivePermissionsModalProps {
  /** The end user whose permissions are shown */
  documentId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * What one end user can do through the Content API: per content type the actions they hold, from
 * which role, with the fields, the conditions (a builder condition in plain English) and the
 * populate depth of each. Nothing is read while it is closed.
 */
const EffectivePermissionsModal = ({
  documentId,
  open,
  onClose,
}: EffectivePermissionsModalProps) => {
  const { formatMessage } = useIntl();

  return (
    <Modal.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>
            {formatMessage({
              id: getTranslation('effective-permissions.title'),
              defaultMessage: 'Effective permissions',
            })}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>{open && <Content documentId={documentId} />}</Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
};

export { EffectivePermissionsModal };
export type { EffectivePermissionsModalProps };
