import * as React from 'react';

import {
  isFetchError,
  Layouts,
  Page,
  useAPIErrorHandler,
  useFetchClient,
  useNotification,
  useRBAC,
} from '@strapi/admin/strapi-admin';
import {
  Box,
  Button,
  Field,
  Flex,
  Grid,
  SingleSelect,
  SingleSelectOption,
  Toggle,
  Typography,
} from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { TokenProfilesTable } from '../components/TokenProfilesTable';
import { PERMISSIONS, PLUGIN_ID } from '../constants';
import { getTranslation } from '../utils/translations';

import type { Settings, WorkflowRules, WorkflowSummary } from '../constants';

const OFF = 'off';
const NO_RULES: WorkflowRules = {
  approvalStageId: null,
  reworkStageId: null,
  aiReviewStageId: null,
};

const RULES: Array<{ key: keyof WorkflowRules; label: string; hint: string }> = [
  {
    key: 'approvalStageId',
    label: 'Stage that approves content',
    hint: 'Moving an entry to this stage marks all its fields as reviewed by the person who moved it. AI agents cannot move entries here.',
  },
  {
    key: 'aiReviewStageId',
    label: 'When an AI edits an entry, move it to',
    hint: 'So a person checks what the AI changed. Cannot be the approval stage.',
  },
  {
    key: 'reworkStageId',
    label: 'When approved content is edited, move it to',
    hint: 'The approval no longer matches the content, so the entry goes back for review. Needs an approval stage.',
  },
];

type SettingsResponse = {
  settings: Settings;
  reviewWorkflowsEnabled: boolean;
  /** The license includes the governance features */
  governanceEnabled: boolean;
  workflows: WorkflowSummary[];
};

const Section = ({
  title,
  subtitle,
  notice,
  children,
}: {
  title: string;
  subtitle: string;
  notice?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Box background="neutral0" hasRadius shadow="filterShadow" padding={6}>
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Typography variant="delta" tag="h2">
          {title}
        </Typography>
        <Typography variant="pi" textColor="neutral600">
          {subtitle}
        </Typography>
      </Flex>
      {notice}
      {children}
    </Flex>
  </Box>
);

const WorkflowRulesFields = ({
  workflow,
  rules,
  disabled,
  onChange,
}: {
  workflow: WorkflowSummary;
  rules: WorkflowRules;
  disabled: boolean;
  onChange: (rules: WorkflowRules) => void;
}) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={3}>
      <Typography fontWeight="semiBold">{workflow.name}</Typography>
      <Grid.Root gap={4}>
        {RULES.map((rule) => (
          <Grid.Item key={rule.key} col={4} s={12} direction="column" alignItems="stretch">
            <Field.Root
              name={`${workflow.id}.${rule.key}`}
              hint={formatMessage({
                id: getTranslation(`settings.rule.${rule.key}.hint`),
                defaultMessage: rule.hint,
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation(`settings.rule.${rule.key}`),
                  defaultMessage: rule.label,
                })}
              </Field.Label>
              <SingleSelect
                value={rules[rule.key] === null ? OFF : String(rules[rule.key])}
                disabled={disabled}
                onChange={(value) =>
                  onChange({ ...rules, [rule.key]: value === OFF ? null : Number(value) })
                }
              >
                <SingleSelectOption value={OFF}>
                  {formatMessage({
                    id: getTranslation('settings.rule.off'),
                    defaultMessage: 'Off',
                  })}
                </SingleSelectOption>
                {workflow.stages.map((stage) => (
                  <SingleSelectOption key={stage.id} value={String(stage.id)}>
                    {stage.name}
                  </SingleSelectOption>
                ))}
              </SingleSelect>
              <Field.Hint />
            </Field.Root>
          </Grid.Item>
        ))}
      </Grid.Root>
    </Flex>
  );
};

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { get, put } = useFetchClient();
  const { toggleNotification } = useNotification();
  const { formatAPIError } = useAPIErrorHandler();
  const {
    allowedActions: { canUpdate },
  } = useRBAC({ update: PERMISSIONS.update });

  const [response, setResponse] = React.useState<SettingsResponse | null>(null);
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [error, setError] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    get<{ data: SettingsResponse }>(`/${PLUGIN_ID}/settings`)
      .then(({ data }) => {
        setResponse(data.data);
        setSettings(data.data.settings);
      })
      .catch(() => setError(true));
  }, [get]);

  if (error) {
    return <Page.Error />;
  }

  if (response === null || settings === null) {
    return <Page.Loading />;
  }

  const isDirty = JSON.stringify(settings) !== JSON.stringify(response.settings);

  const save = async () => {
    setIsSaving(true);

    try {
      const { data } = await put<{ data: { settings: Settings } }>(
        `/${PLUGIN_ID}/settings`,
        settings
      );
      setResponse({ ...response, settings: data.data.settings });
      setSettings(data.data.settings);
      toggleNotification({
        type: 'success',
        message: formatMessage({ id: getTranslation('tokens.saved'), defaultMessage: 'Saved' }),
      });
    } catch (err) {
      toggleNotification({
        type: 'danger',
        message: isFetchError(err) ? formatAPIError(err) : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Saved rules stay inactive without the license feature: say so rather than hide them
  const governanceNotice = response.governanceEnabled ? null : (
    <Box background="primary100" borderColor="primary200" hasRadius padding={3}>
      <Typography variant="pi" textColor="primary700">
        {formatMessage({
          id: getTranslation('settings.governance.unavailable'),
          defaultMessage:
            'Available with the AI governance feature of an Enterprise license. Labels, reviews and the AI content column work without it.',
        })}
      </Typography>
    </Box>
  );

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage({ id: getTranslation('plugin.name'), defaultMessage: 'Provenance' })}
      </Page.Title>
      <Layouts.Header
        title={formatMessage({ id: getTranslation('plugin.name'), defaultMessage: 'Provenance' })}
        subtitle={formatMessage({
          id: getTranslation('settings.subtitle'),
          defaultMessage: 'Who wrote each field, and who reviewed it.',
        })}
        primaryAction={
          canUpdate ? (
            <Button startIcon={<Check />} onClick={save} loading={isSaving} disabled={!isDirty}>
              {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
            </Button>
          ) : undefined
        }
      />
      <Layouts.Content>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Section
            notice={governanceNotice}
            title={formatMessage({
              id: getTranslation('settings.publishing'),
              defaultMessage: 'Publishing',
            })}
            subtitle={formatMessage({
              id: getTranslation('settings.publishing.subtitle'),
              defaultMessage: 'Applies to every content type, with or without Review Workflows.',
            })}
          >
            <Field.Root
              name="requireReviewBeforePublish"
              hint={formatMessage({
                id: getTranslation('settings.require-review.hint'),
                defaultMessage:
                  'Publishing fails while an AI-generated or AI-assisted field has no valid human review.',
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('settings.require-review'),
                  defaultMessage: 'Require a human review of AI content before publishing',
                })}
              </Field.Label>
              <Box width="20rem">
                <Toggle
                  checked={settings.requireReviewBeforePublish}
                  disabled={!canUpdate || !response.governanceEnabled}
                  offLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.disabled-label',
                    defaultMessage: 'Disabled',
                  })}
                  onLabel={formatMessage({
                    id: 'app.components.ToggleCheckbox.enabled-label',
                    defaultMessage: 'Enabled',
                  })}
                  onChange={(event) =>
                    setSettings({ ...settings, requireReviewBeforePublish: event.target.checked })
                  }
                />
              </Box>
              <Field.Hint />
            </Field.Root>
          </Section>

          <Section
            notice={governanceNotice}
            title={formatMessage({
              id: getTranslation('settings.workflows'),
              defaultMessage: 'Review Workflows',
            })}
            subtitle={formatMessage({
              id: getTranslation('settings.workflows.subtitle'),
              defaultMessage:
                'Move entries between stages based on who edited them. Each rule is optional.',
            })}
          >
            {!response.reviewWorkflowsEnabled ? (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('settings.workflows.unavailable'),
                  defaultMessage: 'Review Workflows is not available on this project.',
                })}
              </Typography>
            ) : response.workflows.length === 0 ? (
              <Typography variant="pi" textColor="neutral600">
                {formatMessage({
                  id: getTranslation('settings.workflows.empty'),
                  defaultMessage: 'No workflow yet.',
                })}
              </Typography>
            ) : (
              <Flex direction="column" alignItems="stretch" gap={6}>
                {response.workflows.map((workflow) => (
                  <WorkflowRulesFields
                    key={workflow.id}
                    workflow={workflow}
                    rules={settings.workflows[workflow.id] ?? NO_RULES}
                    disabled={!canUpdate || !response.governanceEnabled}
                    onChange={(rules) =>
                      setSettings({
                        ...settings,
                        workflows: { ...settings.workflows, [workflow.id]: rules },
                      })
                    }
                  />
                ))}
              </Flex>
            )}
          </Section>

          <Section
            title={formatMessage({
              id: getTranslation('tokens.title'),
              defaultMessage: 'API tokens',
            })}
            subtitle={formatMessage({
              id: getTranslation('tokens.subtitle'),
              defaultMessage:
                'Tell Strapi who writes with each token. Writes from AI agents are recorded as AI content, writes from integrations as automated. Unspecified and mixed tokens stay unattributed unless the client declares AI. Changes are saved right away.',
            })}
          >
            <TokenProfilesTable />
          </Section>
        </Flex>
      </Layouts.Content>
    </Page.Main>
  );
};

const ProtectedSettingsPage = () => (
  <Page.Protect permissions={PERMISSIONS.read}>
    <SettingsPage />
  </Page.Protect>
);

export { ProtectedSettingsPage, SettingsPage };
