import * as React from 'react';

import { Form, InputRenderer, Layouts, Page, useRBAC } from '@strapi/admin/strapi-admin';
import { Alert, Box, Button, Flex, Grid, Typography } from '@strapi/design-system';
import { Check } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { ReadOnlyRow } from '../../components/ReadOnlyRow';
import { PERMISSIONS } from '../../constants';
import { useGetSettingsQuery } from '../../services/settings';
import { getTranslation } from '../../utils/getTranslation';
import { useSaveSettings } from '../../utils/useSaveSettings';

import type { EndUsersSettings, SettingsResponse } from '../../../../shared/contracts/settings';

type AdvancedValues = Pick<EndUsersSettings, 'redirects'>;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Box background="neutral0" padding={6} shadow="filterShadow" hasRadius>
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" tag="h2">
        {title}
      </Typography>
      {children}
    </Flex>
  </Box>
);

/** What `config/plugins.ts` sets, as the server reports it: shown, never editable, never a secret */
const ConfigSection = ({ config }: { config: SettingsResponse['meta']['config'] }) => {
  const { formatMessage } = useIntl();
  const none = formatMessage({
    id: getTranslation('settings.config.none'),
    defaultMessage: 'None',
  });
  const yes = formatMessage({ id: getTranslation('settings.config.yes'), defaultMessage: 'Yes' });
  const no = formatMessage({ id: getTranslation('settings.config.no'), defaultMessage: 'No' });
  const flag = (value: boolean) => (value ? yes : no);
  const list = (values: string[]) => (values.length > 0 ? values.join(', ') : none);
  const row = (id: string, defaultMessage: string, value: React.ReactNode) => (
    <ReadOnlyRow label={formatMessage({ id: getTranslation(id), defaultMessage })}>
      {value}
    </ReadOnlyRow>
  );

  return (
    <Section
      title={formatMessage({
        id: getTranslation('settings.config.title'),
        defaultMessage: 'Set in config/plugins.ts',
      })}
    >
      <Typography textColor="neutral600">
        {formatMessage({
          id: getTranslation('settings.config.hint'),
          defaultMessage: 'These settings are changed in code and cannot be edited here.',
        })}
      </Typography>
      {config.secret.set && config.secret.tooShort && (
        <Alert
          variant="warning"
          closeLabel={formatMessage({ id: 'global.close', defaultMessage: 'Close' })}
        >
          {formatMessage({
            id: getTranslation('settings.config.secret.too-short'),
            defaultMessage: 'The secret is shorter than 32 characters. Use a longer one.',
          })}
        </Alert>
      )}
      {row(
        'settings.config.secret',
        'Secret',
        config.secret.set
          ? formatMessage({
              id: getTranslation('settings.config.secret.set'),
              defaultMessage: 'Set',
            })
          : formatMessage({
              id: getTranslation('settings.config.secret.not-set'),
              defaultMessage: 'Not set',
            })
      )}
      {row('settings.config.trusted-origins', 'Trusted origins', list(config.trustedOrigins))}
      {row(
        'settings.config.cookies.cross-site',
        'Cross-site cookies',
        flag(config.cookies.crossSite)
      )}
      {row('settings.config.cookies.domain', 'Cookie domain', config.cookies.domain ?? none)}
      {row('settings.config.session.expires-in', 'Session lasts', config.session.expiresIn)}
      {row('settings.config.session.update-age', 'Session renewed after', config.session.updateAge)}
      {row(
        'settings.config.session.cookie-cache',
        'Session cookie cache',
        config.session.cookieCache === false ? none : config.session.cookieCache
      )}
      {row('settings.config.rate-limit', 'Rate limiting', flag(config.rateLimit.enabled))}
      {row(
        'settings.config.rate-limit.window',
        'Rate limit window',
        formatMessage(
          { id: getTranslation('settings.config.seconds'), defaultMessage: '{count} seconds' },
          { count: config.rateLimit.window }
        )
      )}
      {row('settings.config.rate-limit.max', 'Requests per window', config.rateLimit.max)}
      {row('settings.config.rate-limit.storage', 'Rate limit storage', config.rateLimit.storage)}
      {row(
        'settings.config.compat.users-permissions',
        'Users & Permissions compatibility',
        flag(config.compat.usersPermissions)
      )}
      {row(
        'settings.config.compat.legacy-jwt',
        'Legacy JWTs accepted until',
        config.compat.legacyJwtUntil ?? none
      )}
      {config.compat.refresh &&
        row(
          'settings.config.compat.refresh',
          'Refresh tokens',
          config.compat.refresh.enabled
            ? formatMessage(
                config.compat.refresh.httpOnly
                  ? {
                      id: getTranslation('settings.config.compat.refresh.cookie'),
                      defaultMessage: 'On, in the cookie {name}',
                    }
                  : {
                      id: getTranslation('settings.config.compat.refresh.body'),
                      defaultMessage: 'On, in the response body (cookie name {name})',
                    },
                { name: config.compat.refresh.cookieName }
              )
            : no
        )}
      {config.compat.connectProviders &&
        row(
          'settings.config.compat.connect-providers',
          'Providers with a connect callback',
          list(config.compat.connectProviders)
        )}
      {row('settings.config.explain', 'Explain mode', flag(config.explain))}
      {row('settings.config.plugins', 'Better Auth plugins', list(config.auth.plugins))}
      {row('settings.config.senders', 'Emails sent from config', list(config.auth.senders))}
    </Section>
  );
};

const AdvancedForm = ({
  settings,
  canUpdate,
}: {
  settings: SettingsResponse;
  canUpdate: boolean;
}) => {
  const { formatMessage } = useIntl();
  const save = useSaveSettings();
  const disabled = !canUpdate;
  const initialValues: AdvancedValues = { redirects: settings.data.redirects };

  const redirect = (name: keyof AdvancedValues['redirects'], id: string, label: string) => (
    <Grid.Item xs={12} col={4} direction="column" alignItems="stretch">
      <InputRenderer
        type="string"
        name={`redirects.${name}`}
        label={formatMessage({ id: getTranslation(id), defaultMessage: label })}
        disabled={disabled}
      />
    </Grid.Item>
  );

  return (
    <Form
      method="PUT"
      initialValues={initialValues}
      disabled={disabled}
      onSubmit={(values: AdvancedValues, helpers) => save(values, helpers)}
    >
      {({ modified, isSubmitting }) => (
        <>
          <Layouts.Header
            title={formatMessage({
              id: getTranslation('settings.advanced.title'),
              defaultMessage: 'Advanced',
            })}
            subtitle={formatMessage({
              id: getTranslation('settings.advanced.subtitle'),
              defaultMessage: 'Redirects, and the settings made in code',
            })}
            primaryAction={
              <Button
                type="submit"
                startIcon={<Check />}
                loading={isSubmitting}
                disabled={disabled || !modified}
              >
                {formatMessage({ id: 'global.save', defaultMessage: 'Save' })}
              </Button>
            }
          />
          <Layouts.Content>
            <Flex direction="column" alignItems="stretch" gap={6}>
              <Section
                title={formatMessage({
                  id: getTranslation('settings.advanced.redirects'),
                  defaultMessage: 'Redirects',
                })}
              >
                <Typography textColor="neutral600">
                  {formatMessage({
                    id: getTranslation('settings.advanced.redirects.hint'),
                    defaultMessage:
                      'Where a user lands after the link in an email: a trusted origin or a relative path.',
                  })}
                </Typography>
                <Grid.Root gap={4}>
                  {redirect(
                    'emailVerified',
                    'settings.advanced.redirects.email-verified',
                    'Email verified'
                  )}
                  {redirect(
                    'passwordReset',
                    'settings.advanced.redirects.password-reset',
                    'Password reset'
                  )}
                  {redirect('error', 'settings.advanced.redirects.error', 'Error')}
                </Grid.Root>
              </Section>
              <ConfigSection config={settings.meta.config} />
            </Flex>
          </Layouts.Content>
        </>
      )}
    </Form>
  );
};

const AdvancedContent = () => {
  const { formatMessage } = useIntl();
  const {
    isLoading: isLoadingPermissions,
    allowedActions: { canUpdate },
  } = useRBAC(PERMISSIONS.settings);
  const settings = useGetSettingsQuery();

  if (isLoadingPermissions || settings.isLoading) {
    return <Page.Loading />;
  }

  if (!settings.data || settings.error) {
    return <Page.Error />;
  }

  return (
    <Page.Main>
      <Page.Title>
        {formatMessage(
          { id: 'Settings.PageTitle', defaultMessage: 'Settings — {name}' },
          {
            name: formatMessage({
              id: getTranslation('settings.advanced.title'),
              defaultMessage: 'Advanced',
            }),
          }
        )}
      </Page.Title>
      <AdvancedForm settings={settings.data} canUpdate={canUpdate} />
    </Page.Main>
  );
};

/** `/settings/end-users/advanced`: the redirect URLs, and `config/plugins.ts` shown read-only */
const AdvancedPage = () => (
  <Page.Protect permissions={PERMISSIONS.settings.read}>
    <AdvancedContent />
  </Page.Protect>
);

export { AdvancedPage };
