/* eslint-disable no-await-in-loop -- the steps run in order, one write at a time: each reads what the one before wrote */
import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import type { MigrationReportItem } from '../../../shared/contracts/migration';
import type { ProviderUpdateBody } from '../../../shared/contracts/providers';
import type { EndUsersSettingsPatch } from '../../../shared/contracts/settings';
import { PLUGIN_ID, PROFILE_UID } from '../constants';
import { BUILT_IN_PROVIDERS } from '../providers/built-in';
import type providerService from '../services/provider';
import type settingsService from '../services/settings';
import { writableFields } from '../utils/writable-fields';
import { readMigrationConfig } from './config';
import type { UpGrant } from './map-providers';
import { mapUpGrant } from './map-providers';
import type { UpAdvanced } from './map-settings';
import { mapUpAdvanced } from './map-settings';
import type { UpEmailKey, UpEmailTemplate } from './map-templates';
import { translateUpTemplate } from './map-templates';
import { claimMigration, addReportItems } from './record';
import type { MigrationRecord } from './record';
import { ITEM_SEVERITY } from './report';
import type { PostSyncStep } from './post-sync';

const EMAIL_KEYS: UpEmailKey[] = ['reset_password', 'email_confirmation'];

/**
 * Re-checks that this start still holds the migration and gives the claim another 15 minutes. Done
 * outside any transaction of ours, before the work it protects: a start whose claim ran out and was
 * taken by another stops here and writes nothing more.
 */
export const keepHold = async (strapi: Core.Strapi, owner: string): Promise<void> => {
  if (!(await claimMigration(strapi, owner))) {
    throw new Error(
      'This start no longer holds the migration: another start claimed it. Nothing more was written.'
    );
  }
};

const item = (
  kind: MigrationReportItem['kind'],
  key: string,
  message: string,
  extra: { count?: number; refs?: string[]; severity?: MigrationReportItem['severity'] } = {}
): MigrationReportItem => ({
  id: `${kind}:${key}`,
  kind,
  severity: extra.severity ?? ITEM_SEVERITY[kind],
  message,
  ...(extra.count === undefined ? {} : { count: extra.count }),
  ...(extra.refs === undefined ? {} : { refs: extra.refs }),
  resolved: false,
});

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Users & Permissions' own store, which the rows of stay after it is switched off */
const readUpStore = <T>(strapi: Core.Strapi, key: string): Promise<T | null> =>
  strapi.store({ type: 'plugin', name: 'users-permissions' }).get({ key }) as Promise<T | null>;

/* -------------------------------------------------------------------------------------------------
 * settings
 * -----------------------------------------------------------------------------------------------*/

/** A path of this server, which the settings accept without asking the engine */
const isRelative = (url: string) =>
  url.startsWith('/') && !url.startsWith('//') && !/[\s\\]/.test(url);

const settingsItems = async (
  strapi: Core.Strapi,
  record: MigrationRecord,
  owner: string,
  advanced: UpAdvanced | null,
  grant: UpGrant | null
): Promise<MigrationReportItem[]> => {
  const plugin = strapi.plugin(PLUGIN_ID);
  const settings = plugin.service('settings') as ReturnType<typeof settingsService>;
  const engine = plugin.service('engine').get() as {
    isTrustedOrigin(url: string): Promise<boolean>;
  };
  const items: MigrationReportItem[] = [];
  const patch: EndUsersSettingsPatch = {};

  if (advanced) {
    // The settings check a redirect against the engine, which answers asynchronously
    const allowed = new Set<string>();

    for (const value of [advanced.email_confirmation_redirection, advanced.email_reset_password]) {
      const url = typeof value === 'string' ? value.trim() : '';

      if (url && (isRelative(url) || (await engine.isTrustedOrigin(url)))) {
        allowed.add(url);
      }
    }

    const mapped = mapUpAdvanced(advanced, {
      emailEnabled: Boolean(strapi.plugin('email')?.provider),
      defaultRoleDocumentId: record.carried.defaultRoleDocumentId,
      isAllowedRedirect: (url) => allowed.has(url),
    });

    Object.assign(patch, mapped.patch);

    for (const { key, reason } of mapped.skipped) {
      items.push(
        item(
          'compat-note',
          `setting-${key}`,
          `The users-permissions setting ${key} was not carried over: ${reason}.`,
          {
            severity: key === 'unique_email' ? 'info' : 'action',
          }
        )
      );
    }
  }

  if (typeof grant?.email?.enabled === 'boolean') {
    patch.methods = { emailPassword: grant.email.enabled };
  }

  // `null` keeps the sign-up to what Users & Permissions allowed by default: no field but the account's own
  const wanted = readMigrationConfig(strapi).registrationFields;

  if (wanted !== null) {
    const writable = new Set(writableFields(strapi, PROFILE_UID));
    const signUp = new Set(settings.signUpFields());
    const kept = wanted.filter((name) => writable.has(name) && signUp.has(name));
    const dropped = wanted.filter((name) => !kept.includes(name));

    patch.signUp = { ...patch.signUp, registrationFields: kept };

    if (dropped.length > 0) {
      items.push(
        item(
          'registration-field-dropped',
          'all',
          `${plural(dropped.length, 'registration field')} in migration.registrationFields ${dropped.length === 1 ? 'is' : 'are'} not a profile field a sign-up can write, so ${dropped.length === 1 ? 'it was' : 'they were'} left out. Add the field to the profile, or remove it from the list.`,
          { count: dropped.length, refs: dropped }
        )
      );
    }
  }

  if (Object.keys(patch).length > 0) {
    await keepHold(strapi, owner);

    try {
      await settings.set(patch);
    } catch (error) {
      if (!(error instanceof errors.ValidationError)) {
        throw error;
      }

      const keys = (
        (error.details as { errors?: Array<{ path?: unknown[] }> } | undefined)?.errors ?? []
      )
        .map((entry) => (entry.path ?? []).join('.'))
        .filter(Boolean);

      strapi.log.warn(`${PLUGIN_ID}: the settings were not carried over: ${messageOf(error)}`);
      items.push(
        item(
          'compat-note',
          'settings-not-saved',
          'The settings end-users refused were not carried over (see the application log). Set sign-up, redirects and sign-in methods in the admin.',
          { count: keys.length, refs: keys, severity: 'action' }
        )
      );
    }
  }

  return items;
};

/* -------------------------------------------------------------------------------------------------
 * templates
 * -----------------------------------------------------------------------------------------------*/

const templateItems = async (
  strapi: Core.Strapi,
  owner: string,
  stored: Partial<Record<UpEmailKey, UpEmailTemplate>> | null
): Promise<MigrationReportItem[]> => {
  const templates = strapi.plugin('email').service('templates') as {
    update(
      key: string,
      locale: string,
      body: { subject: string; html: string; text: string }
    ): Promise<unknown>;
  };
  const items: MigrationReportItem[] = [];

  for (const upKey of EMAIL_KEYS) {
    const template = stored?.[upKey];

    if (!template) {
      continue;
    }

    const translation = translateUpTemplate(upKey, template);
    const label = upKey.replace('_', ' ');

    if (translation.kind === 'translated') {
      try {
        await keepHold(strapi, owner);
        await templates.update(translation.key, translation.locale, {
          subject: translation.subject,
          html: translation.html,
          text: translation.text,
        });
      } catch (error) {
        if (error instanceof Error && /no longer holds the migration/.test(error.message)) {
          throw error;
        }

        strapi.log.warn(
          `${PLUGIN_ID}: the ${label} email was refused by the email plugin: ${messageOf(error)}`
        );
        items.push(
          item(
            'template-untranslated',
            translation.key,
            `The ${label} email was edited, but the email plugin refused it (see the application log). It keeps the end-users default until it is rewritten.`
          )
        );
      }
    } else if (translation.kind === 'untranslated') {
      items.push(
        item(
          'template-untranslated',
          translation.key,
          `The ${label} email was edited and uses ${plural(translation.placeholders.length, 'expression')} that cannot be carried over. It keeps the end-users default until it is rewritten.`,
          { count: translation.placeholders.length, refs: translation.placeholders }
        )
      );
    }
  }

  return items;
};

/* -------------------------------------------------------------------------------------------------
 * providers
 * -----------------------------------------------------------------------------------------------*/

const requiredFields = (id: string): string[] | null => {
  const definition = BUILT_IN_PROVIDERS.find((provider) => provider.id === id);

  return definition
    ? Object.entries(definition.fields ?? {})
        .filter(([, field]) => field.required)
        .map(([name]) => name)
    : null;
};

const hasEncryptionKey = (strapi: Core.Strapi): boolean => {
  try {
    const encryption = strapi.service('admin::encryption') as {
      encrypt(value: string): string | null;
    };

    return encryption.encrypt('probe') !== null;
  } catch {
    return false;
  }
};

/** What Users & Permissions held for a provider and is not a secret, as `name: value` for the admin to copy */
const heldValues = (body: ProviderUpdateBody): string => {
  const values: string[] = [];

  if (body.clientId) {
    values.push(`clientId: ${body.clientId}`);
  }

  for (const [name, value] of Object.entries(body.fields ?? {})) {
    if (typeof value === 'string' && value !== '') {
      values.push(`${name}: ${value}`);
    }
  }

  if (body.scopes && body.scopes.length > 0) {
    values.push(`scopes: ${body.scopes.join(', ')}`);
  }

  return values.length > 0 ? ` It held ${values.join('; ')}.` : '';
};

const needsInput = (id: string, missing: string[], why: string, body: ProviderUpdateBody) =>
  item(
    'provider-needs-input',
    id,
    `The ${id} provider is not carried over yet: ${why}.${heldValues(body)} Its redirect URI is the one shown in its settings.`,
    { count: missing.length, refs: missing }
  );

const providerItems = async (
  strapi: Core.Strapi,
  owner: string,
  grant: UpGrant | null
): Promise<MigrationReportItem[]> => {
  const providers = strapi.plugin(PLUGIN_ID).service('provider') as ReturnType<
    typeof providerService
  >;
  const withKey = hasEncryptionKey(strapi);
  const items: MigrationReportItem[] = [];

  // `not-supported` ones are the report's already (listed before the migration started)
  for (const mapping of mapUpGrant(grant ?? {}, requiredFields)) {
    if (mapping.kind !== 'mapped' && mapping.kind !== 'needs-input') {
      continue;
    }

    const { upId } = mapping;
    const missing = mapping.kind === 'needs-input' ? mapping.missing : [];

    // The service encrypts the secret, which needs a key: without one the provider waits for it
    if (!withKey && mapping.body.clientSecret) {
      items.push(
        needsInput(
          upId,
          [...new Set([...missing, 'clientSecret'])],
          'admin.secrets.encryptionKey is not set, so its secret cannot be stored; set the key, then enter the secret in the admin',
          mapping.body
        )
      );
      continue;
    }

    try {
      await keepHold(strapi, owner);
      await providers.update(upId, mapping.body);
    } catch (error) {
      if (/no longer holds the migration/.test(messageOf(error))) {
        throw error;
      }

      // The service stores a provider only when its credentials are complete, a disabled one too
      if (mapping.kind === 'mapped') {
        strapi.log.warn(`${PLUGIN_ID}: the ${upId} provider was not stored: ${messageOf(error)}`);
      }

      items.push(
        needsInput(
          upId,
          missing,
          mapping.kind === 'mapped'
            ? 'it could not be stored (see the application log); set it up in the admin'
            : `it needs ${missing.join(', ')} before it can be stored; enter them in the admin`,
          mapping.body
        )
      );
    }
  }

  return items;
};

/* -------------------------------------------------------------------------------------------------
 * The step
 * -----------------------------------------------------------------------------------------------*/

/**
 * Users & Permissions' stores become end-users': the advanced settings and the sign-in method into
 * the settings, the two emails into the email plugin's templates, the providers into the provider
 * store. U&P's own keys are never deleted: a rollback reads them.
 */
export const storesStep: PostSyncStep = {
  name: 'stores',
  async run(strapi, record, owner) {
    const advanced = await readUpStore<UpAdvanced>(strapi, 'advanced');
    const grant = await readUpStore<UpGrant>(strapi, 'grant');
    const email = await readUpStore<Partial<Record<UpEmailKey, UpEmailTemplate>>>(strapi, 'email');

    const items = [
      ...(await settingsItems(strapi, record, owner, advanced, grant)),
      ...(await templateItems(strapi, owner, email)),
      ...(await providerItems(strapi, owner, grant)),
    ];

    await addReportItems(strapi, items);
  },
};
