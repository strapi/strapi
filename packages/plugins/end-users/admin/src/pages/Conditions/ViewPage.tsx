import * as React from 'react';

import { BackButton, Layouts, Page, useRBAC } from '@strapi/admin/strapi-admin';
import {
  Alert,
  Box,
  Flex,
  Grid,
  Link,
  Loader,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
} from '@strapi/design-system';
import { Information } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { NavLink, useParams } from 'react-router-dom';

import { NotFound } from '../../components/NotFound';
import { PERMISSIONS } from '../../constants';
import { pluginId } from '../../pluginId';
import { useGetBuilderLayoutQuery, useGetConditionsQuery } from '../../services/conditions';
import { useGetPermissionLayoutQuery } from '../../services/permissions';
import { getTranslation } from '../../utils/getTranslation';
import { describeParam } from '../../utils/paramWords';
import { withOccurrenceKeys } from '../../utils/withOccurrenceKeys';

import { QueryChips } from './components/QueryChips';
import { SelfWritableAlert } from './components/SelfWritableAlert';
import { createPartDescriber } from './utils/describeBuilderParts';
import { SOURCE_LABELS } from './utils/sourceLabels';
import { summarize } from './utils/summarize';
import { toReadOnlyQuery } from './utils/toReadOnlyQuery';

import type { BuilderConditionV2, EntryGroup } from '../../../../shared/builder/types';
import type { ConditionListItem } from '../../../../shared/contracts/conditions';
import type { PermissionLayout } from '../../../../shared/contracts/permissions';

/** Where the list is, and where Back goes: the conditions page is mounted here */
const CONDITIONS_PATH = `/settings/${pluginId}/conditions`;

const ROLES_PATH = `/settings/${pluginId}/roles`;

/** What each condition the plugin ships does, in a paragraph: built from what its definition does */
const BUILT_IN_DESCRIPTIONS: Record<string, { id: string; defaultMessage: string }> = {
  'plugin::end-users.is-self': {
    id: getTranslation('conditions.view.description.is-self'),
    defaultMessage:
      "The entry is the signed-in end user's own account. It applies to the end-user type only, and it matches nothing for Public, where nobody is signed in. While a role uses it, the email and the username can't be changed by updating the entry: they change through the account endpoints, which verify the new value.",
  },
  'plugin::end-users.is-owner': {
    id: getTranslation('conditions.view.description.is-owner'),
    defaultMessage:
      "The entry's owner is the signed-in end user: it matches when the relation to the end-user type that the role chooses (<code>field</code>) points at them, and it matches nothing for Public. It applies to content types that have such a relation, and a content type with only one needs no choice. When the role holds it on Create, the relation is set to the signed-in user (turn that off with <code>setOnCreate</code>), and on update the relation can't be changed, so an owner can't hand an entry to someone else.",
  },
};

/* -------------------------------------------------------------------------------------------------
 * Section
 * -----------------------------------------------------------------------------------------------*/

interface SectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const Section = ({ title, description, children }: SectionProps) => {
  const headingId = React.useId();

  return (
    <Box
      tag="section"
      aria-labelledby={headingId}
      background="neutral0"
      padding={6}
      shadow="filterShadow"
      hasRadius
    >
      <Flex direction="column" alignItems="stretch" gap={4}>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Typography id={headingId} variant="delta" tag="h2">
            {title}
          </Typography>
          {description && <Typography textColor="neutral600">{description}</Typography>}
        </Flex>
        {children}
      </Flex>
    </Box>
  );
};

interface DetailProps {
  label: string;
  children: React.ReactNode;
}

const Detail = ({ label, children }: DetailProps) => (
  <Grid.Item col={6} xs={12} direction="column" alignItems="stretch" gap={1}>
    <Typography variant="sigma" textColor="neutral600">
      {label}
    </Typography>
    {children}
  </Grid.Item>
);

/* -------------------------------------------------------------------------------------------------
 * BuilderSections
 * -----------------------------------------------------------------------------------------------*/

/** One entry group as nested lists: a heading for how the group matches, then its checks and groups */
const GroupList = ({
  group,
  describeCheck,
}: {
  group: EntryGroup;
  describeCheck: ReturnType<typeof createPartDescriber>['entryCheck'];
}) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={1}>
      <Typography textColor="neutral600" fontWeight="bold">
        {formatMessage(
          {
            id: getTranslation('conditions.view.match'),
            defaultMessage:
              '{match, select, any {Any of these is true} none {None of these is true} other {All of these are true}}',
          },
          { match: group.match }
        )}
      </Typography>
      <Flex direction="column" alignItems="stretch" gap={1} tag="ul" paddingLeft={4}>
        {withOccurrenceKeys(group.items, (item) => JSON.stringify(item)).map(([key, item]) => (
          <Box tag="li" key={key}>
            {item.kind === 'group' ? (
              <GroupList group={item} describeCheck={describeCheck} />
            ) : (
              <Typography textColor="neutral800">{describeCheck(item)}</Typography>
            )}
          </Box>
        ))}
      </Flex>
    </Flex>
  );
};

/** What a version 2 condition does: its summary, then each of its parts as the builder has them */
const BuilderSections = ({ builder }: { builder: BuilderConditionV2 }) => {
  const { formatMessage } = useIntl();
  const { data: layout, isLoading: isLoadingLayout } = useGetBuilderLayoutQuery();
  const describe = React.useMemo(
    () => createPartDescriber((message, values) => formatMessage(message, values)),
    [formatMessage]
  );
  const sentences = React.useMemo(
    () =>
      layout ? summarize(builder, layout, (message, values) => formatMessage(message, values)) : [],
    [builder, layout, formatMessage]
  );
  const { inputs, who, which, onSave } = builder;
  const none = (
    <Typography textColor="neutral600">
      {formatMessage({
        id: getTranslation('conditions.view.none'),
        defaultMessage: 'None',
      })}
    </Typography>
  );

  return (
    <>
      <Section
        title={formatMessage({
          id: getTranslation('conditions.view.summary'),
          defaultMessage: 'Summary',
        })}
      >
        <Flex direction="column" alignItems="stretch" gap={1}>
          {isLoadingLayout && <Loader small />}
          {!isLoadingLayout && !layout && (
            <Typography textColor="neutral600">
              {formatMessage({
                id: getTranslation('conditions.view.summary-unavailable'),
                defaultMessage:
                  "The summary couldn't be loaded. The parts below are shown as saved.",
              })}
            </Typography>
          )}
          {sentences.map((sentence) => (
            <Typography key={sentence} textColor="neutral800">
              {sentence}
            </Typography>
          ))}
        </Flex>
      </Section>

      <Section
        title={formatMessage({
          id: getTranslation('conditions.view.inputs'),
          defaultMessage: 'Inputs',
        })}
      >
        {inputs.length === 0 ? (
          <Typography textColor="neutral600">
            {formatMessage({
              id: getTranslation('conditions.view.params.none'),
              defaultMessage: 'This condition takes no inputs.',
            })}
          </Typography>
        ) : (
          <Table colCount={5} rowCount={inputs.length + 1}>
            <Thead>
              <Tr>
                {[
                  { id: 'global.name', defaultMessage: 'Name' },
                  { id: getTranslation('conditions.view.params.type'), defaultMessage: 'Type' },
                  {
                    id: getTranslation('conditions.view.inputs.accepts'),
                    defaultMessage: 'Accepts',
                  },
                  {
                    id: getTranslation('conditions.view.params.required'),
                    defaultMessage: 'Required',
                  },
                  {
                    id: getTranslation('conditions.view.params.default'),
                    defaultMessage: 'Default',
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
              {inputs.map((input) => (
                <Tr key={input.name}>
                  <Td>
                    <Typography textColor="neutral800">
                      <code>{input.name}</code>
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">{input.kind}</Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {describe.accepts(input.accepts)}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {formatMessage(
                        {
                          id: getTranslation('conditions.view.params.required-value'),
                          defaultMessage: '{required, select, true {Yes} other {No}}',
                        },
                        { required: String(input.required) }
                      )}
                    </Typography>
                  </Td>
                  <Td>
                    <Typography textColor="neutral800">
                      {input.default === undefined ? '—' : JSON.stringify(input.default)}
                    </Typography>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Section>

      <Section
        title={formatMessage({
          id: getTranslation('conditions.view.who'),
          defaultMessage: 'Who checks',
        })}
        description={formatMessage(
          {
            id: getTranslation('conditions.view.who.description'),
            defaultMessage:
              '{match, select, any {It applies to a user when any of these is true.} other {It applies to a user when all of these are true.}}',
          },
          { match: who.match }
        )}
      >
        {who.checks.length === 0 ? (
          none
        ) : (
          <Flex direction="column" alignItems="stretch" gap={1} tag="ul">
            {withOccurrenceKeys(who.checks, (check) => JSON.stringify(check)).map(
              ([key, check]) => (
                <Typography tag="li" key={key} textColor="neutral800">
                  {describe.whoCheck(check)}
                </Typography>
              )
            )}
          </Flex>
        )}
      </Section>

      <Section
        title={formatMessage({
          id: getTranslation('conditions.view.which'),
          defaultMessage: 'Which entries',
        })}
      >
        {which.items.length === 0 ? (
          <Typography textColor="neutral600">
            {formatMessage({
              id: getTranslation('conditions.view.which.nothing'),
              defaultMessage: 'It restricts nothing.',
            })}
          </Typography>
        ) : (
          <GroupList group={which} describeCheck={describe.entryCheck} />
        )}
      </Section>

      {(onSave.stamp.length > 0 || onSave.locked.length > 0) && (
        <Section
          title={formatMessage({
            id: getTranslation('conditions.view.writes'),
            defaultMessage: 'When entries are written',
          })}
        >
          <Flex direction="column" alignItems="stretch" gap={2} tag="ul">
            {onSave.stamp.map((rule) => (
              <Typography tag="li" key={rule.field} textColor="neutral800">
                {formatMessage(
                  {
                    id: getTranslation('conditions.view.stamp-rule'),
                    defaultMessage: 'On create: {rule}',
                  },
                  { rule: describe.stamp(rule) }
                )}
              </Typography>
            ))}
            {onSave.locked.length > 0 && (
              <Typography tag="li" textColor="neutral800">
                {formatMessage(
                  {
                    id: getTranslation('conditions.view.locked-list'),
                    defaultMessage: "Can't change on update: {fields}",
                  },
                  { fields: onSave.locked.join(', ') }
                )}
              </Typography>
            )}
          </Flex>
        </Section>
      )}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ConditionView
 * -----------------------------------------------------------------------------------------------*/

interface ConditionViewProps {
  condition: ConditionListItem;
  layout: PermissionLayout;
  canReadRoles: boolean;
}

/** The content types it applies to, by label, or "Every content type" when none is left out */
const AppliesTo = ({
  subjects,
  layout,
}: Pick<ConditionViewProps, 'layout'> & { subjects: string[] }) => {
  const { formatMessage } = useIntl();
  const isEveryContentType =
    layout.contentTypes.length > 0 &&
    layout.contentTypes.every(({ uid }) => subjects.includes(uid));

  if (isEveryContentType) {
    return (
      <Typography textColor="neutral800">
        {formatMessage({
          id: getTranslation('conditions.view.every-content-type'),
          defaultMessage: 'Every content type',
        })}
      </Typography>
    );
  }

  if (subjects.length === 0) {
    return (
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('conditions.list.no-content-types'),
          defaultMessage: 'None',
        })}
      </Typography>
    );
  }

  return (
    <Flex gap={2} wrap="wrap">
      {subjects.map((uid) => (
        <Box key={uid} background="neutral100" paddingLeft={2} paddingRight={2} hasRadius>
          <Typography textColor="neutral800" title={uid}>
            {layout.contentTypes.find((contentType) => contentType.uid === uid)?.label ?? uid}
          </Typography>
        </Box>
      ))}
    </Flex>
  );
};

const ConditionView = ({ condition, layout, canReadRoles }: ConditionViewProps) => {
  const { formatMessage } = useIntl();
  const {
    name,
    displayName,
    source,
    subjects,
    params,
    stamp,
    lockedFields,
    usedByRoles,
    query,
    builder,
    stale,
    selfWritable,
  } = condition;

  const description = source === 'builtin' ? BUILT_IN_DESCRIPTIONS[name] : undefined;
  const readOnlyQuery = React.useMemo(
    () =>
      query === undefined
        ? undefined
        : toReadOnlyQuery(query, (message, values) => formatMessage(message, values)),
    [query, formatMessage]
  );

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          {
            name: formatMessage({
              id: getTranslation('conditions.list.title'),
              defaultMessage: 'Conditions',
            }),
          }
        )}
      </Page.Title>
      <Layouts.Header
        title={displayName}
        subtitle={formatMessage({
          id: getTranslation('conditions.builder.subtitle'),
          defaultMessage: 'The entries a role can reach when it holds this condition',
        })}
        navigationAction={
          // The back link for mobile is placed higher up in the settings layout
          <Box display={{ initial: 'none', medium: 'block' }}>
            <BackButton fallback={CONDITIONS_PATH} />
          </Box>
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Flex gap={3} padding={4} background="neutral100" borderColor="neutral200" hasRadius>
            <Information fill="neutral600" aria-hidden />
            <Typography textColor="neutral800">
              {formatMessage(
                {
                  id: getTranslation('conditions.view.read-only'),
                  defaultMessage:
                    "{source, select, builtin {It is built into the end-users plugin, so it can't be changed.} plugin {A plugin registers it: change it in that plugin.} code {It is written in your project's code, in <code>src/end-users/conditions</code>: change it there.} other {It is a file in <code>src/end-users/conditions</code> that the builder did not write: change the file.}}",
                },
                {
                  source,
                  code: (chunks: React.ReactNode) => <code>{chunks}</code>,
                }
              )}
            </Typography>
          </Flex>

          {(stale?.length ?? 0) > 0 && (
            <Alert
              variant="danger"
              closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
            >
              {formatMessage(
                {
                  id: getTranslation('conditions.list.stale'),
                  defaultMessage:
                    "{count, plural, one {# condition refers} other {# conditions refer}} to content types or fields that no longer exist. They deny everything until they're fixed.",
                },
                { count: 1 }
              )}
            </Alert>
          )}
          {selfWritable && <SelfWritableAlert fields={selfWritable} />}

          <Section
            title={formatMessage({
              id: getTranslation('conditions.view.about'),
              defaultMessage: 'About',
            })}
          >
            {description && (
              <Typography textColor="neutral800">
                {formatMessage(description, {
                  code: (chunks: React.ReactNode) => <code>{chunks}</code>,
                })}
              </Typography>
            )}
            <Grid.Root gap={4}>
              <Detail
                label={formatMessage({
                  id: getTranslation('conditions.builder.display-name'),
                  defaultMessage: 'Display name',
                })}
              >
                <Typography textColor="neutral800">{displayName}</Typography>
              </Detail>
              <Detail label={formatMessage({ id: 'global.name', defaultMessage: 'Name' })}>
                <Typography textColor="neutral800">
                  <code>{name}</code>
                </Typography>
              </Detail>
              <Detail
                label={formatMessage({
                  id: getTranslation('conditions.list.source'),
                  defaultMessage: 'Source',
                })}
              >
                <Typography textColor="neutral800">
                  {formatMessage(SOURCE_LABELS[source])}
                </Typography>
              </Detail>
              <Detail
                label={formatMessage({
                  id: getTranslation('conditions.list.content-types'),
                  defaultMessage: 'Content types',
                })}
              >
                <AppliesTo subjects={subjects} layout={layout} />
              </Detail>
            </Grid.Root>
          </Section>

          {builder ? (
            <BuilderSections builder={builder} />
          ) : (
            <>
              <Section
                title={formatMessage({
                  id: getTranslation('conditions.builder.where'),
                  defaultMessage: 'Where',
                })}
                description={
                  readOnlyQuery
                    ? formatMessage({
                        id: getTranslation('conditions.view.where.description'),
                        defaultMessage: 'An entry is kept when every row is true.',
                      })
                    : undefined
                }
              >
                {readOnlyQuery && <QueryChips query={readOnlyQuery} />}
                {query !== undefined && !readOnlyQuery && (
                  <>
                    <Typography textColor="neutral600">
                      {formatMessage({
                        id: getTranslation('conditions.view.where.as-written'),
                        defaultMessage:
                          'The query is more than rows that are all true, so it is shown as it is written.',
                      })}
                    </Typography>
                    <Box
                      tag="pre"
                      background="neutral100"
                      padding={4}
                      hasRadius
                      style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
                    >
                      <code>{JSON.stringify(query, null, 2)}</code>
                    </Box>
                  </>
                )}
                {query === undefined && (
                  <Typography textColor="neutral800">
                    {formatMessage({
                      id: getTranslation('conditions.view.where.computed'),
                      defaultMessage: 'Computed in code when it runs',
                    })}
                  </Typography>
                )}
              </Section>

              <Section
                title={formatMessage({
                  id: getTranslation('conditions.view.params'),
                  defaultMessage: 'Inputs',
                })}
              >
                {params.length === 0 ? (
                  <Typography textColor="neutral600">
                    {formatMessage({
                      id: getTranslation('conditions.view.params.none'),
                      defaultMessage: 'This condition takes no inputs.',
                    })}
                  </Typography>
                ) : (
                  <Table colCount={5} rowCount={params.length + 1}>
                    <Thead>
                      <Tr>
                        {[
                          { id: 'global.name', defaultMessage: 'Name' },
                          {
                            id: getTranslation('conditions.view.params.type'),
                            defaultMessage: 'Type',
                          },
                          {
                            id: getTranslation('conditions.view.params.required'),
                            defaultMessage: 'Required',
                          },
                          {
                            id: getTranslation('conditions.view.params.default'),
                            defaultMessage: 'Default',
                          },
                          {
                            id: getTranslation('conditions.view.params.relation'),
                            defaultMessage: 'Relation to',
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
                      {params.map((param) => (
                        <Tr key={param.name}>
                          <Td>
                            <Typography textColor="neutral800" title={param.name}>
                              {describeParam(param.name, formatMessage).label}
                              {param.createOnly && (
                                <Typography textColor="neutral600">
                                  {' '}
                                  {formatMessage({
                                    id: getTranslation('conditions.view.params.create-only'),
                                    defaultMessage: '(create only)',
                                  })}
                                </Typography>
                              )}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">{param.type}</Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">
                              {formatMessage(
                                {
                                  id: getTranslation('conditions.view.params.required-value'),
                                  defaultMessage: '{required, select, true {Yes} other {No}}',
                                },
                                { required: String(param.required) }
                              )}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800">
                              {param.default === undefined ? '—' : JSON.stringify(param.default)}
                            </Typography>
                          </Td>
                          <Td>
                            <Typography textColor="neutral800" title={param.relationTarget}>
                              {param.relationTarget === undefined
                                ? '—'
                                : (layout.contentTypes.find(
                                    ({ uid }) => uid === param.relationTarget
                                  )?.label ?? param.relationTarget)}
                            </Typography>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Section>

              {(stamp || lockedFields) && (
                <Section
                  title={formatMessage({
                    id: getTranslation('conditions.view.writes'),
                    defaultMessage: 'When entries are written',
                  })}
                >
                  <Flex direction="column" alignItems="stretch" gap={2} tag="ul">
                    {stamp && (
                      <Typography tag="li" textColor="neutral800">
                        {formatMessage({
                          id: getTranslation('conditions.view.stamp'),
                          defaultMessage: 'Sets fields when an entry is created',
                        })}
                      </Typography>
                    )}
                    {lockedFields && (
                      <Typography tag="li" textColor="neutral800">
                        {formatMessage({
                          id: getTranslation('conditions.view.locked-fields'),
                          defaultMessage: "Some fields can't change on update",
                        })}
                      </Typography>
                    )}
                  </Flex>
                </Section>
              )}
            </>
          )}

          <Section
            title={formatMessage({
              id: getTranslation('conditions.list.used-by'),
              defaultMessage: 'Used by',
            })}
          >
            {usedByRoles.length === 0 ? (
              <Typography textColor="neutral600">
                {formatMessage({
                  id: getTranslation('conditions.view.used-by.none'),
                  defaultMessage: 'No role uses this condition yet.',
                })}
              </Typography>
            ) : (
              <Flex direction="column" alignItems="stretch" gap={2} tag="ul">
                {usedByRoles.map((role) => (
                  <Typography tag="li" key={role.documentId} textColor="neutral800">
                    {canReadRoles ? (
                      <Link
                        tag={NavLink}
                        to={`${ROLES_PATH}/${encodeURIComponent(role.documentId)}`}
                      >
                        {role.name}
                      </Link>
                    ) : (
                      role.name
                    )}
                  </Typography>
                ))}
              </Flex>
            )}
          </Section>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ViewPage
 * -----------------------------------------------------------------------------------------------*/

/**
 * `/settings/end-users/conditions/view/:name`: what a condition does, read-only. It is the page of
 * a built-in, a code and a plugin condition, which have no builder; the name is the condition's own
 * (`plugin::end-users.is-owner`), so it can't be a builder slug or `new`.
 */
const ViewPage = () => {
  const { name } = useParams<{ name: string }>();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canRead: canReadRoles },
  } = useRBAC(PERMISSIONS.roles);
  const { data: conditions, isLoading: isLoadingConditions } = useGetConditionsQuery();
  const { data: layout, isLoading: isLoadingLayout } = useGetPermissionLayoutQuery();

  if (isLoadingPermissions || isLoadingConditions || isLoadingLayout) {
    return <Page.Loading />;
  }

  if (!conditions || !layout) {
    return <Page.Error />;
  }

  const condition = conditions.find((each) => each.name === name);

  if (!condition) {
    return <NotFound kind="condition" backPath={CONDITIONS_PATH} />;
  }

  return <ConditionView condition={condition} layout={layout} canReadRoles={canReadRoles} />;
};

export { ViewPage };
