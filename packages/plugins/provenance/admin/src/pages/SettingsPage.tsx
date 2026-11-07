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
import { Box, Button, Field, Flex, Toggle, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { TokenProfilesTable } from '../components/TokenProfilesTable';
import { PERMISSIONS, PLUGIN_ID } from '../constants';
import { getTranslation } from '../utils/translations';

import type { Settings } from '../constants';

type SettingsResponse = {
  settings: Settings;
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
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
      {children}
    </Flex>
  </Box>
);

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
            title={formatMessage({
              id: getTranslation('settings.publishing'),
              defaultMessage: 'Publishing',
            })}
            subtitle={formatMessage({
              id: getTranslation('settings.publishing.subtitle'),
              defaultMessage: 'Applies to every content type, whoever clicks Publish.',
            })}
          >
            <Field.Root
              name="requireReviewBeforePublish"
              hint={formatMessage({
                id: getTranslation('settings.require-review.hint'),
                defaultMessage:
                  'Publishing fails while a field known to be AI has no valid human review. It only covers AI that Strapi was told about: agents, tokens set to AI agent, client declarations and fields marked by editors.',
              })}
            >
              <Field.Label>
                {formatMessage({
                  id: getTranslation('settings.require-review'),
                  defaultMessage: 'Require a human review of declared AI content before publishing',
                })}
              </Field.Label>
              <Box width="20rem">
                <Toggle
                  checked={settings.requireReviewBeforePublish}
                  disabled={!canUpdate}
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
            title={formatMessage({
              id: getTranslation('tokens.title'),
              defaultMessage: 'Content API tokens',
            })}
            subtitle={formatMessage({
              id: getTranslation('tokens.subtitle'),
              defaultMessage:
                'Tell Strapi who writes with each token, until agents can use the Content API with their own identity. Writes from AI agents are recorded as AI content, writes from integrations as automated. Unspecified and mixed tokens stay unattributed unless the client declares AI. Changes are saved right away.',
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
