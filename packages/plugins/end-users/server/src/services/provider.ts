import { contentTypes, errors } from '@strapi/utils';
import type { Core, Struct } from '@strapi/types';

import type {
  ProfileMappingRow,
  ProfileMappingWhen,
  ProviderCreateBody,
  ProviderDetail,
  ProviderSummary,
  ProviderUpdateBody,
} from '../../../shared/contracts/providers';
import { PLUGIN_ID, PROFILE_UID } from '../constants';
import { resolveBasePath } from '../engine/better-auth/base-path';
import { resolveServerOrigin } from '../engine/better-auth/server-origin';
import type { ProviderOptions } from '../engine/startup-inputs';
import {
  createDefinition,
  readClaim,
  readPath,
  RESERVED_PROVIDER_IDS,
  resolveOptions,
} from '../providers/define-provider';
import type {
  ProviderClaim,
  ProviderDefinition,
  ProviderField,
} from '../providers/define-provider';
import { checkDiscoveryDocument, DiscoveryError } from '../providers/discovery';
import type { ConfiguredProvider } from '../providers/registry';
import { registry } from '../providers/registry';
import { writableProfileAttributes } from '../utils/writable-profile-attributes';
import { PERMISSIONS_TTL_MS } from './ability';

/** Where the providers are kept: the core store, as `plugin_end-users_providers`. */
const STORE_KEY = 'providers';

const NO_KEY_MESSAGE = 'Set `admin.secrets.encryptionKey` to store provider secrets';

const CONFIG_LOCKED = (id: string) =>
  `The provider "${id}" is set in config/plugins.ts, so it is read-only here. Change it there.`;

const ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const DEFAULT_OIDC_SCOPES = ['openid', 'profile', 'email'];

type Plain = Record<string, unknown>;

const WHEN: ProfileMappingWhen[] = ['sign-up', 'every-sign-in'];

/**
 * The profile attribute types a claim of each type can be written to. A claim typed as a path, that
 * no definition suggests, has no type of its own: any attribute a provider may write takes it, and
 * the profile's own validation judges each value.
 */
const FITS: Record<ProviderClaim['type'], string[]> = {
  string: ['string', 'text', 'richtext', 'email', 'uid', 'enumeration', 'json'],
  number: ['integer', 'biginteger', 'float', 'decimal', 'json'],
  boolean: ['boolean', 'json'],
  datetime: ['datetime', 'date', 'time', 'timestamp'],
  'string[]': ['json'],
};

/**
 * What the store holds for one provider. The secret and every `secret` field are ciphertext
 * (`admin::encryption`); nothing else here is secret. `custom` is there for a provider an
 * administrator made, which no definition describes.
 */
interface StoredProvider {
  enabled: boolean;
  clientId: string;
  clientSecret: string | null;
  /** Empty means the definition's default scopes. */
  scopes: string[];
  trustForLinking: boolean;
  /** Off when missing: a provider saved before this setting existed. */
  updateUserOnSignIn?: boolean;
  profileMapping?: ProfileMappingRow[];
  fields: Record<string, string | boolean>;
  custom?: { name: string; discoveryUrl: string };
}

type StoredDocument = Record<string, StoredProvider>;

/** A provider as the admin sees it: its definition, where it is set, and what is stored for it. */
interface Entry {
  id: string;
  definition: ProviderDefinition;
  source: 'admin' | 'config';
  package: string | null;
  custom: boolean;
  stored?: StoredProvider;
  configured?: ConfiguredProvider;
}

const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMissing = (value: unknown) => value === undefined || value === null || value === '';

const invalid = (path: string[], message: string): never => {
  throw new errors.ValidationError(message, {
    errors: [{ path, message, name: 'ValidationError' }],
  });
};

/** A secret that is not being changed: left out, or sent back the way the answer shows it. */
const isKept = (value: unknown) =>
  isMissing(value) ||
  (isPlain(value) && Object.keys(value).length === 1 && typeof value.set === 'boolean');

const isHttpUrl = (value: unknown) => {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const { protocol } = new URL(value);

    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const customDefinition = (id: string, custom: { name: string; discoveryUrl: string }) =>
  createDefinition('oauth', {
    id,
    name: custom.name,
    defaultScopes: DEFAULT_OIDC_SCOPES,
    init: ({ clientId, clientSecret, scopes }) => ({
      discoveryUrl: custom.discoveryUrl,
      clientId,
      clientSecret,
      scopes,
    }),
  });

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * A secret shorter than this is not blanked out of a log line: it would be a common run of
 * characters and garble the text around it (a one-letter secret turns every such letter into
 * `[secret]`). The response to a client never carries error text at all.
 */
const MIN_SCRUBBED_LENGTH = 6;

/** `text` with every secret in `secrets` blanked out, for a log line. */
const scrub = (text: string, secrets: string[]) =>
  secrets
    .filter((secret) => secret.length >= MIN_SCRUBBED_LENGTH)
    .reduce((result, secret) => result.split(secret).join('[secret]'), text);

/**
 * `strapi.plugin('end-users').service('provider')`: the sign-in providers an administrator
 * configures.
 *
 * Every provider of the registry can be configured. What an administrator saves is one document in
 * Strapi's core store, with the client secret and every `secret` field encrypted by
 * `admin::encryption`; they come back only as `{ set }`. A provider set in `config/plugins.ts` is
 * locked: it is listed, and a write is refused. Config wins over a stored entry for the same id,
 * and the stored entry stays.
 *
 * Better Auth reads the providers only when it is built, so a write reloads the
 * engine on this server at once, and puts the stored document back when that fails. Other servers
 * rebuild through `service('engine').ensureCurrent()` on their next authentication request.
 * `options()` is what that reads. The stored document and what is built from it are kept like the
 * settings are, for `PERMISSIONS_TTL_MS` and cleared at once by a write here.
 */
const providerService = ({ strapi }: { strapi: Core.Strapi }) => {
  const store = () => strapi.store({ type: 'plugin', name: PLUGIN_ID });
  const encryption = () =>
    strapi.service('admin::encryption') as {
      encrypt(value: string): string | null;
      decrypt(value: string): string | null;
    };
  const engine = () => strapi.plugin(PLUGIN_ID).service('engine') as { reload(): Promise<void> };

  // The configuration does not change while the application runs, and reading it loads the packages
  let providerRegistry: ReturnType<typeof registry> | undefined;
  const providers = () => {
    providerRegistry ??= registry(strapi);

    return providerRegistry;
  };

  let cachedStored: { document: StoredDocument; expiresAt: number } | undefined;
  let cachedOptions: { options: ProviderOptions; expiresAt: number } | undefined;

  /** Bumped by every write: a read under way when one happens must not be put in the cache. */
  let generation = 0;

  const forget = () => {
    generation += 1;
    cachedStored = undefined;
    cachedOptions = undefined;
  };

  /** Writes run one at a time, so a rollback never undoes another write. */
  let queue: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(run: () => Promise<T>): Promise<T> => {
    const next = queue.then(run, run);

    queue = next.catch(() => undefined);

    return next;
  };

  const readRaw = async (): Promise<unknown> => store().get({ key: STORE_KEY });

  const toDocument = (raw: unknown): StoredDocument =>
    isPlain(raw) ? (raw as StoredDocument) : {};

  const readStored = async (): Promise<StoredDocument> => {
    if (cachedStored && cachedStored.expiresAt > Date.now()) {
      return cachedStored.document;
    }

    const startedAt = generation;
    const document = toDocument(await readRaw());

    if (startedAt === generation) {
      cachedStored = { document, expiresAt: Date.now() + PERMISSIONS_TTL_MS };
    }

    return document;
  };

  const decrypt = (cipher: unknown): string | null => {
    if (typeof cipher !== 'string' || cipher === '') {
      return null;
    }

    try {
      return encryption().decrypt(cipher);
    } catch {
      return null;
    }
  };

  const entriesOf = (document: StoredDocument): Entry[] => {
    const known = providers();
    const configured = new Map(known.fromConfig().map((one) => [one.definition.id, one]));
    const entries: Entry[] = [];

    for (const definition of known.available()) {
      const fromConfig = configured.get(definition.id);

      entries.push({
        id: definition.id,
        definition,
        source: fromConfig ? 'config' : 'admin',
        package: known.packageOf(definition.id),
        custom: false,
        stored: isPlain(document[definition.id]) ? document[definition.id] : undefined,
        configured: fromConfig,
      });
    }

    const taken = new Set(entries.map((entry) => entry.id));

    for (const [id, stored] of Object.entries(document)) {
      if (!taken.has(id) && isPlain(stored) && isPlain(stored.custom)) {
        entries.push({
          id,
          definition: customDefinition(id, stored.custom),
          source: 'admin',
          package: null,
          custom: true,
          stored,
        });
      }
    }

    return entries;
  };

  /** The options of an entry as `resolveOptions` takes them, with the secrets in the clear. */
  const plainOptions = (entry: Entry): { options: Plain; undecryptable: boolean } => {
    if (entry.configured) {
      return { options: entry.configured.options, undecryptable: false };
    }

    const { stored } = entry;

    if (!stored) {
      return { options: {}, undecryptable: false };
    }

    let undecryptable = false;
    const secret = (cipher: unknown) => {
      if (isMissing(cipher)) {
        return undefined;
      }

      const plain = decrypt(cipher);

      if (plain === null) {
        undecryptable = true;
      }

      return plain ?? undefined;
    };

    const fields: Plain = {};

    for (const [key, field] of Object.entries(entry.definition.fields ?? {})) {
      const value = stored.fields?.[key];

      fields[key] = field.type === 'secret' ? secret(value) : value;
    }

    return {
      options: {
        ...fields,
        clientId: stored.clientId,
        clientSecret: secret(stored.clientSecret),
        scopes:
          Array.isArray(stored.scopes) && stored.scopes.length > 0 ? stored.scopes : undefined,
      },
      undecryptable,
    };
  };

  const isEnabled = (entry: Entry) =>
    entry.configured ? entry.configured.enabled : entry.stored?.enabled === true;

  const isRow = (value: unknown): value is ProfileMappingRow =>
    isPlain(value) &&
    typeof value.attribute === 'string' &&
    typeof value.claim === 'string' &&
    value.claim.trim() !== '' &&
    WHEN.includes(value.when as ProfileMappingWhen);

  /** What the entry maps from the provider's profile; from config it is read-only. */
  const rawMapping = (entry: Entry): unknown =>
    entry.configured ? entry.configured.options.profileMapping : entry.stored?.profileMapping;

  /** The well-formed rows of the entry; a hand-written one in config that is not is left out. */
  const mappingOf = (entry: Entry): ProfileMappingRow[] => {
    const raw = rawMapping(entry);

    return Array.isArray(raw)
      ? raw
          .filter(isRow)
          .map((row) => ({ attribute: row.attribute, claim: row.claim.trim(), when: row.when }))
      : [];
  };

  const updatesUserOnSignIn = (entry: Entry): boolean =>
    entry.configured
      ? entry.configured.options.updateUserOnSignIn === true
      : entry.stored?.updateUserOnSignIn === true;

  /**
   * Why `row` cannot be saved, or nothing when it can: its attribute must be one a provider may
   * write (the registration-field rules: a plain, writable, non-private attribute of the profile,
   * never a relation, never `user`) and of a type the claim fits.
   */
  const rowProblem = (entry: Entry, row: ProfileMappingRow): string | undefined => {
    const schema = strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;
    const attribute = schema.attributes[row.attribute];

    if (!attribute) {
      return `"${row.attribute}" is not an attribute of the profile`;
    }

    if (row.attribute === 'user') {
      return '"user" is the profile’s owner, which a provider never writes';
    }

    if (!contentTypes.isScalarAttribute(attribute)) {
      return `"${row.attribute}" is a ${attribute.type}, and a provider writes plain values only`;
    }

    if (contentTypes.isPrivateAttribute(schema, row.attribute)) {
      return `"${row.attribute}" is private`;
    }

    if (!writableProfileAttributes(strapi).includes(row.attribute)) {
      return `"${row.attribute}" cannot be written by a provider`;
    }

    const claim = entry.definition.claims?.[row.claim];

    if (claim && !FITS[claim.type].includes(attribute.type)) {
      return `"${row.attribute}" is a ${attribute.type}, which the ${claim.type} claim "${row.claim}" does not fit`;
    }

    return undefined;
  };

  const redirectUri = (id: string) =>
    `${resolveServerOrigin(strapi.config)}${resolveBasePath(strapi.config)}/callback/${id}`;

  const summarize = (entry: Entry): ProviderSummary => {
    const enabled = isEnabled(entry);
    let status: ProviderSummary['status'] = 'ready';

    if (!enabled) {
      status = 'disabled';
    } else if (plainOptions(entry).undecryptable) {
      status = 'needs-secret';
    }

    return {
      id: entry.id,
      name: entry.definition.name,
      kind: entry.definition.kind === 'social' ? 'social' : 'oidc',
      source: entry.source,
      package: entry.package,
      enabled,
      status,
      configured: entry.custom || entry.configured !== undefined || entry.stored !== undefined,
      redirectUri: redirectUri(entry.id),
    };
  };

  const detail = (entry: Entry): ProviderDetail => {
    const { options } = plainOptions(entry);
    const definitionFields = entry.definition.fields ?? {};
    const fields: ProviderDetail['fields'] = {};

    for (const [key, field] of Object.entries(definitionFields)) {
      const value = entry.configured ? options[key] : entry.stored?.fields?.[key];

      fields[key] =
        field.type === 'secret' ? { set: !isMissing(value) } : ((value as string) ?? null);
    }

    const scopes = (options.scopes as string[] | undefined) ?? entry.definition.defaultScopes ?? [];
    const stored = entry.stored;

    return {
      ...summarize(entry),
      clientId: typeof options.clientId === 'string' ? options.clientId : '',
      clientSecretSet: entry.configured
        ? !isMissing(options.clientSecret)
        : !isMissing(stored?.clientSecret),
      scopes: [...scopes],
      trustForLinking: entry.configured ? false : stored?.trustForLinking === true,
      updateUserOnSignIn: updatesUserOnSignIn(entry),
      profileMapping: mappingOf(entry),
      ...(entry.custom && stored?.custom ? { discoveryUrl: stored.custom.discoveryUrl } : {}),
      fields,
      definition: {
        fields: structuredClone(definitionFields) as Record<string, ProviderField>,
        claims: structuredClone(entry.definition.claims ?? {}),
      },
    };
  };

  const find = async (id: string): Promise<Entry> => {
    const entry = entriesOf(await readStored()).find((one) => one.id === id);

    if (!entry) {
      throw new errors.NotFoundError(`There is no provider "${id}"`);
    }

    return entry;
  };

  const assertWritable = (entry: Entry) => {
    if (entry.source === 'config') {
      invalid([], CONFIG_LOCKED(entry.id));
    }
  };

  /**
   * What the engine will do with these options, checked now: the definition's `init` must accept
   * them, and a discovery URL it gives must answer with an OpenID discovery document. Better Auth
   * swallows both failures when it is built (the provider is left out and the rebuild goes on), so
   * a bad one would be saved and shown as ready. The messages are fixed text: neither what `init`
   * threw nor what the other server sent reaches the client.
   */
  const checkBuildable = async (
    entry: Entry,
    definition: ProviderDefinition,
    options: ReturnType<typeof resolveOptions>
  ) => {
    let init: unknown;

    try {
      init = definition.init(options);
    } catch (error) {
      strapi.log.warn(
        `${PLUGIN_ID}: the provider "${entry.id}" was not saved, its definition threw: ${scrub(
          messageOf(error),
          [options.clientSecret, ...Object.values(options)].filter(
            (value): value is string => typeof value === 'string'
          )
        )}`
      );

      return invalid(
        [],
        `The provider "${entry.id}" was not saved: its definition cannot be built from these settings.`
      );
    }

    const discoveryUrl = isPlain(init) ? init.discoveryUrl : undefined;

    if (typeof discoveryUrl !== 'string' || discoveryUrl === '') {
      return;
    }

    try {
      await checkDiscoveryDocument(discoveryUrl);
    } catch (error) {
      if (error instanceof DiscoveryError) {
        return invalid(
          entry.custom ? ['discoveryUrl'] : [],
          `The provider "${entry.id}" was not saved: its discovery document ${error.message}.`
        );
      }

      throw error;
    }
  };

  /**
   * Checks a save against the definition and returns the entry to store, with the secrets
   * encrypted. A secret left out keeps what is stored. Throws `ValidationError`, never with a
   * secret in it.
   */
  const prepare = async (
    entry: Entry,
    body: unknown
  ): Promise<{ next: StoredProvider; secrets: string[] }> => {
    if (!isPlain(body)) {
      return invalid([], 'A provider is an object');
    }

    const allowed = [
      'enabled',
      'clientId',
      'clientSecret',
      'scopes',
      'trustForLinking',
      'updateUserOnSignIn',
      'profileMapping',
      'fields',
      ...(entry.custom ? ['name', 'discoveryUrl'] : []),
    ];

    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) {
        invalid([key], `${key} is not something to set on the provider "${entry.id}"`);
      }
    }

    const {
      enabled,
      clientId,
      clientSecret,
      scopes,
      trustForLinking,
      updateUserOnSignIn,
      profileMapping,
      fields,
    } = body;

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      invalid(['enabled'], 'enabled is true or false');
    }

    if (trustForLinking !== undefined && typeof trustForLinking !== 'boolean') {
      invalid(['trustForLinking'], 'trustForLinking is true or false');
    }

    if (updateUserOnSignIn !== undefined && typeof updateUserOnSignIn !== 'boolean') {
      invalid(['updateUserOnSignIn'], 'updateUserOnSignIn is true or false');
    }

    let nextMapping = entry.stored?.profileMapping;

    if (profileMapping !== undefined) {
      if (!Array.isArray(profileMapping)) {
        invalid(['profileMapping'], 'profileMapping is a list of rows');
      }

      const taken = new Set<string>();

      nextMapping = (profileMapping as unknown[]).map((row, index) => {
        const name = `profileMapping[${index}]`;

        if (!isRow(row)) {
          return invalid(
            ['profileMapping', String(index)],
            `${name} needs an attribute, a claim, and when it is written: "sign-up" or "every-sign-in"`
          );
        }

        const problem = rowProblem(entry, row);

        if (problem) {
          invalid(['profileMapping', String(index), 'attribute'], `${name}: ${problem}`);
        }

        if (taken.has(row.attribute)) {
          invalid(
            ['profileMapping', String(index), 'attribute'],
            `${name}: "${row.attribute}" is mapped by another row; an attribute takes one claim`
          );
        }

        taken.add(row.attribute);

        return { attribute: row.attribute, claim: row.claim.trim(), when: row.when };
      });
    }

    if (clientId !== undefined && typeof clientId !== 'string') {
      invalid(['clientId'], 'clientId is a string');
    }

    if (
      scopes !== undefined &&
      !(Array.isArray(scopes) && scopes.every((scope) => typeof scope === 'string'))
    ) {
      invalid(['scopes'], 'scopes is a list of strings');
    }

    if (fields !== undefined && !isPlain(fields)) {
      invalid(['fields'], 'fields is an object');
    }

    let custom = entry.stored?.custom;

    if (entry.custom) {
      const name = body.name ?? custom?.name;
      const discoveryUrl = body.discoveryUrl ?? custom?.discoveryUrl;

      if (typeof name !== 'string' || name.trim() === '') {
        invalid(['name'], 'name is the text the sign-in button shows');
      }

      if (!isHttpUrl(discoveryUrl)) {
        invalid(
          ['discoveryUrl'],
          'discoveryUrl is the http(s) address of the issuer’s discovery document'
        );
      }

      custom = { name: (name as string).trim(), discoveryUrl: discoveryUrl as string };
    }

    const definitionFields = entry.definition.fields ?? {};
    const given = (fields ?? {}) as Plain;

    for (const key of Object.keys(given)) {
      if (!Object.hasOwn(definitionFields, key)) {
        invalid(['fields', key], `${key} is not a field of ${entry.definition.name}`);
      }
    }

    const existing = { ...plainOptions(entry).options };

    // A secret belongs to the endpoint it was given for. When the discovery URL or any field that
    // can shape where the provider talks changes, the stored secrets are not carried to the new
    // address: they are cleared unless the request sends them again, so a client secret never
    // reaches an endpoint that was not approved with it. A field shapes the address unless it is a
    // secret or a boolean: a `string` is a domain, a region or a tenant a host is built from, and a
    // `select` can be one too.
    const text = (value: unknown) => (isMissing(value) ? '' : value);
    const endpointChanged =
      (entry.custom &&
        body.discoveryUrl !== undefined &&
        body.discoveryUrl !== entry.stored?.custom?.discoveryUrl) ||
      Object.entries(definitionFields).some(
        ([key, field]) =>
          field.type !== 'secret' &&
          field.type !== 'boolean' &&
          Object.hasOwn(given, key) &&
          text(given[key]) !== text(existing[key] ?? field.default)
      );

    if (endpointChanged) {
      delete existing.clientSecret;

      for (const [key, field] of Object.entries(definitionFields)) {
        if (field.type === 'secret') {
          delete existing[key];
        }
      }
    }

    // The secrets being set now, in the clear; the others keep their ciphertext
    const fresh: Record<string, string> = {};

    const take = (name: string, path: string[], value: unknown) => {
      if (isKept(value)) {
        return;
      }

      if (typeof value !== 'string') {
        invalid(path, `${name} is a string`);
      }

      fresh[name] = value as string;
    };

    take('clientSecret', ['clientSecret'], clientSecret);

    if (endpointChanged && fresh.clientSecret === undefined) {
      invalid(
        ['clientSecret'],
        'The address of the provider changed, so its client secret has to be entered again'
      );
    }

    for (const [key, field] of Object.entries(definitionFields)) {
      if (field.type === 'secret' && Object.hasOwn(given, key)) {
        take(key, ['fields', key], given[key]);
      }
    }

    const candidate: Plain = {};

    for (const [key, field] of Object.entries(definitionFields)) {
      if (field.type === 'secret') {
        candidate[key] = fresh[key] ?? existing[key];
      } else if (Object.hasOwn(given, key)) {
        candidate[key] = given[key];
      } else {
        candidate[key] = existing[key];
      }
    }

    const nextScopes =
      scopes === undefined
        ? (existing.scopes as string[] | undefined)
        : [...new Set((scopes as string[]).map((scope) => scope.trim()).filter(Boolean))];

    candidate.clientId = clientId ?? existing.clientId;
    candidate.clientSecret = fresh.clientSecret ?? existing.clientSecret;
    candidate.scopes = nextScopes && nextScopes.length > 0 ? nextScopes : undefined;

    let resolved: ReturnType<typeof resolveOptions> | undefined;

    try {
      resolved = resolveOptions(
        entry.definition,
        candidate,
        `The provider "${entry.id}" cannot be saved`
      );
    } catch (error) {
      invalid([], messageOf(error));
    }

    const willBeEnabled = (enabled as boolean | undefined) ?? entry.stored?.enabled ?? true;

    if (willBeEnabled && resolved) {
      // A custom provider's definition is made from what is saved now, not from what was stored
      await checkBuildable(
        entry,
        entry.custom && custom ? customDefinition(entry.id, custom) : entry.definition,
        resolved
      );
    }

    const secrets = [
      ...Object.values(fresh),
      ...Object.entries(candidate)
        .filter(([key]) => key === 'clientSecret' || definitionFields[key]?.type === 'secret')
        .map(([, value]) => value)
        .filter((value): value is string => typeof value === 'string'),
    ];

    const seal = (name: string, kept: unknown): string | null => {
      if (!(name in fresh)) {
        return typeof kept === 'string' && kept !== '' ? kept : null;
      }

      const cipher = encryption().encrypt(fresh[name]);

      if (cipher === null) {
        invalid([], NO_KEY_MESSAGE);
      }

      return cipher;
    };

    const nextFields: Record<string, string | boolean> = {};

    for (const [key, field] of Object.entries(definitionFields)) {
      const value =
        field.type === 'secret'
          ? seal(key, endpointChanged ? null : entry.stored?.fields?.[key])
          : (candidate[key] as string | boolean | undefined);

      if (!isMissing(value)) {
        nextFields[key] = value as string | boolean;
      }
    }

    return {
      secrets,
      next: {
        enabled: (enabled as boolean | undefined) ?? entry.stored?.enabled ?? true,
        clientId: candidate.clientId as string,
        clientSecret: seal('clientSecret', endpointChanged ? null : entry.stored?.clientSecret),
        scopes: candidate.scopes ? (candidate.scopes as string[]) : [],
        trustForLinking:
          (trustForLinking as boolean | undefined) ?? entry.stored?.trustForLinking ?? false,
        updateUserOnSignIn:
          (updateUserOnSignIn as boolean | undefined) ?? entry.stored?.updateUserOnSignIn ?? false,
        profileMapping: nextMapping ?? [],
        fields: nextFields,
        ...(custom ? { custom } : {}),
      },
    };
  };

  /**
   * Stores what `compute` makes for `id` (or removes the entry when it gives `null`), reloads the
   * engine, and puts the document back when the reload fails: the save is refused and nothing
   * changed. `compute` is handed the document as it is in the store now, inside the queue of
   * writes, never the cached one.
   *
   * A failed reload answers with a fixed message. What failed (which may be text another server
   * sent) goes to the log, with the secrets blanked out, and never to the client.
   */
  const persist = (
    id: string,
    compute: (
      document: StoredDocument
    ) =>
      | { next: StoredProvider | null; secrets: string[] }
      | Promise<{ next: StoredProvider | null; secrets: string[] }>
  ) =>
    exclusive(async () => {
      const previous = await readRaw();
      const document = { ...toDocument(previous) };
      const { next, secrets } = await compute(document);

      if (next) {
        document[id] = next;
      } else {
        delete document[id];
      }

      await store().set({ key: STORE_KEY, value: document });
      forget();

      try {
        await engine().reload();
      } catch (error) {
        if (previous === null || previous === undefined) {
          await store().delete({ key: STORE_KEY });
        } else {
          await store().set({ key: STORE_KEY, value: previous });
        }

        forget();

        strapi.log.error(
          `${PLUGIN_ID}: the provider "${id}" was not saved, the sign-in engine could not be rebuilt with it: ${scrub(messageOf(error), secrets)}`
        );

        throw new errors.ValidationError(
          `The provider "${id}" was not saved: the sign-in engine could not be rebuilt with it.`
        );
      }
    });

  const copyOf = (options: ProviderOptions): ProviderOptions => ({
    socialProviders: { ...options.socialProviders },
    genericOAuth: [...options.genericOAuth],
    trustedProviders: [...options.trustedProviders],
    ...(options.secrets
      ? { secrets: { fields: [...options.secrets.fields], values: [...options.secrets.values] } }
      : {}),
  });

  const build = async (): Promise<ProviderOptions> => {
    const built: ProviderOptions = { socialProviders: {}, genericOAuth: [], trustedProviders: [] };
    const secretFields = new Set<string>();
    const secretValues = new Set<string>();

    for (const entry of entriesOf(await readStored())) {
      if (!isEnabled(entry)) {
        continue;
      }

      const { options, undecryptable } = plainOptions(entry);

      if (undecryptable) {
        strapi.log.warn(
          `${PLUGIN_ID}: the provider "${entry.id}" is left out: its stored secret cannot be decrypted (did admin.secrets.encryptionKey change?). Save its secret again.`
        );
        continue;
      }

      for (const [key, field] of Object.entries(entry.definition.fields ?? {})) {
        if (field.type === 'secret') {
          secretFields.add(key);

          if (typeof options[key] === 'string' && options[key] !== '') {
            secretValues.add(options[key] as string);
          }
        }
      }

      if (typeof options.clientSecret === 'string' && options.clientSecret !== '') {
        secretValues.add(options.clientSecret);
      }

      try {
        const init = entry.definition.init(
          resolveOptions(entry.definition, options, `The provider "${entry.id}"`)
        );

        // The toggle is the administrator's, so it wins over whatever the definition set. Better
        // Auth names it differently for a social provider and for a generic OAuth one.
        const update = updatesUserOnSignIn(entry);

        if (entry.definition.kind === 'social') {
          built.socialProviders[entry.id] = {
            ...(init as Plain),
            overrideUserInfoOnSignIn: update,
          };
        } else {
          built.genericOAuth.push({
            pkce: true,
            ...(init as Plain),
            overrideUserInfo: update,
            providerId: entry.id,
          });
        }

        const raw = rawMapping(entry);

        if (raw !== undefined && (!Array.isArray(raw) || raw.some((row) => !isRow(row)))) {
          strapi.log.warn(
            `${PLUGIN_ID}: the profileMapping of the provider "${entry.id}" has rows that are left out: each is { attribute, claim, when: 'sign-up' | 'every-sign-in' }.`
          );
        }

        if (entry.stored?.trustForLinking && !entry.configured) {
          built.trustedProviders.push(entry.id);
        }
      } catch (error) {
        const secrets = [options.clientSecret, ...Object.values(options)].filter(
          (value): value is string => typeof value === 'string'
        );

        strapi.log.warn(
          `${PLUGIN_ID}: the provider "${entry.id}" is left out: ${scrub(messageOf(error), secrets)}`
        );
      }
    }

    built.secrets = { fields: [...secretFields], values: [...secretValues] };

    return built;
  };

  return {
    /** Every available provider, the ones set in config and the custom ones, as summaries. */
    async list(): Promise<ProviderSummary[]> {
      return entriesOf(await readStored()).map(summarize);
    },

    async get(id: string): Promise<ProviderDetail> {
      return detail(await find(id));
    },

    /** Saves a provider's credentials and settings; the secrets are encrypted. */
    async update(id: string, body: ProviderUpdateBody): Promise<ProviderDetail> {
      assertWritable(await find(id));

      // What is kept (secrets, fields) comes from the store as it is when the write runs, not from
      // the cache, which another server's save can have left behind
      await persist(id, async (document) => {
        const entry = entriesOf(document).find((one) => one.id === id);

        if (!entry) {
          throw new errors.NotFoundError(`There is no provider "${id}"`);
        }

        assertWritable(entry);

        return prepare(entry, body);
      });

      return detail(await find(id));
    },

    /** Makes a custom OpenID Connect provider. */
    async create(body: ProviderCreateBody): Promise<ProviderDetail> {
      if (!isPlain(body)) {
        return invalid([], 'A provider is an object');
      }

      const { name } = body;

      if (typeof name !== 'string' || name.trim() === '') {
        invalid(['name'], 'name is the text the sign-in button shows');
      }

      const id = body.id === undefined ? slug(name) : body.id;

      if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
        invalid(['id'], 'id is lowercase letters, numbers and dashes, such as "my-idp"');
      }

      if (RESERVED_PROVIDER_IDS.includes(id)) {
        invalid(['id'], `"${id}" is reserved by the sign-in engine, choose another id`);
      }

      const document = await readStored();

      if (entriesOf(document).some((one) => one.id === id)) {
        invalid(['id'], `There is a provider "${id}" already`);
      }

      const custom = { name: name.trim(), discoveryUrl: String(body.discoveryUrl) };
      const entry: Entry = {
        id,
        definition: customDefinition(id, custom),
        source: 'admin',
        package: null,
        custom: true,
      };

      const { id: _ignored, ...rest } = body;
      await persist(id, async () => prepare(entry, rest));

      return detail(await find(id));
    },

    /** Removes a custom provider, or clears what is stored for any other. */
    async delete(id: string): Promise<void> {
      const entry = await find(id);

      assertWritable(entry);

      if (entry.stored) {
        await persist(id, () => ({ next: null, secrets: [] }));
      }
    },

    /**
     * The profile attributes each enabled provider writes from its claims, once each. Whoever signs
     * in with the provider can set them (a claim such as GitHub's `company` is the user's own
     * text), which the builder's warning about values a condition trusts has to know.
     */
    async mappedAttributes(): Promise<Array<{ id: string; name: string; attributes: string[] }>> {
      return entriesOf(await readStored())
        .filter(isEnabled)
        .map((entry) => ({
          id: entry.id,
          name: entry.definition.name,
          attributes: [...new Set(mappingOf(entry).map((row) => row.attribute))],
        }))
        .filter(({ attributes }) => attributes.length > 0);
    },

    /**
     * The values to write to a user's profile from what the provider sent (its raw `profile`): one
     * per mapping row of `when`, read at the row's claim, and checked against the profile's own
     * validation. `entity` is the profile that exists, on a sign-in (so a unique value that is the
     * profile's own passes). A claim the provider did not send is left out; one the profile refuses
     * is left out too and logged, without its value, and the sign-in goes on.
     */
    async profileValues(
      providerId: string,
      profile: unknown,
      when: ProfileMappingWhen,
      entity?: { id?: string | number }
    ): Promise<Plain> {
      const entry = entriesOf(await readStored()).find((one) => one.id === providerId);
      const rows = entry ? mappingOf(entry).filter((row) => row.when === when) : [];
      const values: Plain = {};

      if (!entry || rows.length === 0) {
        return values;
      }

      const schema = strapi.contentType(PROFILE_UID) as Struct.ContentTypeSchema;
      const writable = new Set(writableProfileAttributes(strapi));

      for (const row of rows) {
        const claim = entry.definition.claims?.[row.claim];
        const value = claim
          ? readClaim(entry.definition, row.claim, profile)
          : readPath(profile, row.claim);

        if (isMissing(value)) {
          continue;
        }

        const skip = (reason: string) =>
          strapi.log.warn(
            `${PLUGIN_ID}: the claim "${row.claim}" of the provider "${providerId}" is not written to the profile attribute "${row.attribute}": ${reason}`
          );

        if (!writable.has(row.attribute)) {
          skip('the profile has no such attribute a provider may write.');
          continue;
        }

        try {
          const checked = (await strapi.entityValidator.validateEntityUpdate(
            schema as never,
            { [row.attribute]: value } as never,
            { isDraft: false } as never,
            entity as never
          )) as Plain;

          values[row.attribute] = row.attribute in checked ? checked[row.attribute] : value;
        } catch (error) {
          skip(messageOf(error));
        }
      }

      return values;
    },

    /**
     * What Better Auth is built with: the enabled providers set in config and stored, in its own
     * shapes (`StartupInputs.providers`). A stored provider whose secret no longer decrypts is left
     * out, with a warning that names it.
     */
    async options(): Promise<ProviderOptions> {
      if (cachedOptions && cachedOptions.expiresAt > Date.now()) {
        const { options } = cachedOptions;

        return copyOf(options);
      }

      const startedAt = generation;
      const options = await build();

      if (startedAt === generation) {
        cachedOptions = { options, expiresAt: Date.now() + PERMISSIONS_TTL_MS };
      }

      return copyOf(options);
    },
  };
};

export default providerService;
