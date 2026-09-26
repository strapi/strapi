import * as React from 'react';
import {
  Alert,
  Box,
  Button,
  Flex,
  Field,
  Textarea,
  TextInput,
  Typography,
} from '@strapi/design-system';
import { Check, Trash } from '@strapi/icons';
import { Layouts, Page, useFetchClient, useNotification } from '@strapi/strapi/admin';
import { useIntl } from 'react-intl';

import getTrad from '../utils/getTrad';

const SettingsPage = () => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { get, put, post } = useFetchClient();

  const [status, setStatus] = React.useState(null);
  const [credentialsJson, setCredentialsJson] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    const { data } = await get('/google-translate/settings');
    setStatus(data);
  }, [get]);

  React.useEffect(() => {
    loadSettings().catch(() => {
      setStatus({ configured: false });
    });
  }, [loadSettings]);

  const save = async ({ clear = false } = {}) => {
    setSaving(true);
    try {
      const { data } = await put('/google-translate/settings', {
        credentialsJson: clear ? '' : credentialsJson,
        apiKey: clear ? '' : apiKey,
      });
      setStatus(data);
      setCredentialsJson('');
      setApiKey('');
      toggleNotification({
        type: 'success',
        message: clear ? 'Credentials removed' : 'Google credentials saved',
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: error?.response?.data?.error?.message || error.message || 'Could not save credentials',
      });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const { data } = await post('/google-translate/settings/test');
      toggleNotification({
        type: 'success',
        message: `Google Translate works. Sample: ${data.sample}`,
      });
    } catch (error) {
      toggleNotification({
        type: 'danger',
        message: error?.response?.data?.error?.message || error.message || 'Translation test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Page.Main>
      <Layouts.Header
        title={formatMessage({
          id: getTrad('settings.title'),
          defaultMessage: 'Google Translate',
        })}
        subtitle={formatMessage({
          id: getTrad('settings.subtitle'),
          defaultMessage:
            'Paste your Google credentials here. They are stored in Strapi and never read from .env.',
        })}
        primaryAction={
          <Button startIcon={<Check />} loading={saving} onClick={() => save()}>
            {formatMessage({ id: getTrad('settings.save'), defaultMessage: 'Save credentials' })}
          </Button>
        }
      />
      <Layouts.Content>
        <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
          <Flex direction="column" alignItems="stretch" gap={4}>
            {status?.configured ? (
              <Alert closeLabel="Close" variant="success">
                {formatMessage({
                  id: getTrad('settings.configured'),
                  defaultMessage: 'Credentials are saved',
                })}
                {status.kind === 'serviceAccount' && status.clientEmail
                  ? ` (${status.clientEmail})`
                  : status.kind === 'apiKey'
                    ? ' (API key)'
                    : ''}
              </Alert>
            ) : (
              <Alert closeLabel="Close" variant="default">
                {formatMessage({
                  id: getTrad('settings.notConfigured'),
                  defaultMessage: 'No credentials saved yet',
                })}
              </Alert>
            )}

            <Field.Root
              name="credentialsJson"
              hint="Download a JSON key for a service account that can use Cloud Translation API."
            >
              <Field.Label>
                {formatMessage({
                  id: getTrad('settings.json.label'),
                  defaultMessage: 'Service account JSON',
                })}
              </Field.Label>
              <Textarea
                value={credentialsJson}
                onChange={(event) => setCredentialsJson(event.target.value)}
                placeholder={formatMessage({
                  id: getTrad('settings.json.placeholder'),
                  defaultMessage: 'Paste the full JSON key file from Google Cloud',
                })}
              />
            </Field.Root>

            <Field.Root name="apiKey">
              <Field.Label>
                {formatMessage({
                  id: getTrad('settings.apiKey.label'),
                  defaultMessage: 'Or API key',
                })}
              </Field.Label>
              <TextInput
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={formatMessage({
                  id: getTrad('settings.apiKey.placeholder'),
                  defaultMessage: 'Optional if you use a simple API key instead of a service account',
                })}
              />
            </Field.Root>

            <Typography variant="pi" textColor="neutral600">
              Paste either the service account JSON or an API key, then save. The private key is not shown
              again after saving.
            </Typography>

            <Flex gap={2}>
              <Button variant="secondary" loading={testing} disabled={!status?.configured} onClick={test}>
                {formatMessage({ id: getTrad('settings.test'), defaultMessage: 'Test translation' })}
              </Button>
              <Button
                variant="danger-light"
                startIcon={<Trash />}
                disabled={!status?.configured || saving}
                onClick={() => save({ clear: true })}
              >
                {formatMessage({ id: getTrad('settings.clear'), defaultMessage: 'Remove credentials' })}
              </Button>
            </Flex>
          </Flex>
        </Box>
      </Layouts.Content>
    </Page.Main>
  );
};

export default SettingsPage;
