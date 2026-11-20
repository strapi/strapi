/**
 * The body template of a webhook: a JSON object sent in place of the default payload.
 *
 * Its string values can hold `{{ variable }}` placeholders. The variables are a small, closed
 * list rather than paths into the payload, so that the shape of the payload is not a contract
 * every saved template depends on:
 *
 * - `event`, `createdAt`: available for every event.
 * - `model`, `uid`, `documentId`, `entry`, `entry.<field>`: available for the `entry.*` events.
 *   `<field>` is a scalar field of the content type: the others (relations, media, components,
 *   dynamic zones) are not populated on every event, and private fields are never sent.
 *
 * `validateWebhookBody` checks a template against that list when it is saved.
 * `renderWebhookBody` renders it when the webhook is sent:
 *
 * - A string made of a single placeholder is replaced by the value, as is, so `"entry": "{{ entry }}"`
 *   embeds the whole entry object. A missing value gives `null`.
 * - Placeholders inside a longer string are replaced by their text: strings as is, numbers and
 *   booleans stringified, dates as ISO strings, objects and arrays as JSON. A missing value gives
 *   an empty string.
 * - Object keys are copied as is. Other values (numbers, booleans, null) are copied as is.
 */

import _ from 'lodash';
import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { Modules, Schema, UID } from '@strapi/types';

type Payload = Record<string, unknown>;
type Template = Record<string, unknown>;
type Webhook = Modules.WebhookStore.Webhook;
export type ContentTypes = Record<string, Pick<Schema.ContentType, 'attributes' | 'options'>>;

const { ValidationError } = errors;

/** Points at the `body` field, so the admin form shows the message under the template input. */
const bodyError = (message: string) =>
  new ValidationError(message, {
    errors: [{ path: ['body'], message, name: 'ValidationError', value: null }],
  });

const BODY_TEMPLATE_FUTURE_FLAG = 'unstableWebhookBodyTemplate';

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;
const SINGLE_PLACEHOLDER = /^\s*\{\{\s*([^{}\s]+)\s*\}\}\s*$/;
// Also matches what PLACEHOLDER leaves as text (`{{ entry title }}`), which is a mistake at save
const ANY_PLACEHOLDER = /\{\{(.*?)\}\}/gs;

const EVENT_VARIABLES = new Set(['event', 'createdAt']);
const ENTRY_VARIABLES = new Set(['model', 'uid', 'documentId', 'entry']);
const ENTRY_FIELD_PREFIX = 'entry.';
const ENTRY_EVENT_PREFIX = 'entry.';
// The fields of every entry that are not in the attributes of every content type
const COMMON_ENTRY_FIELDS = new Set(['id', 'documentId', 'createdAt', 'updatedAt']);
const NON_SCALAR_TYPES = new Set(['relation', 'media', 'component', 'dynamiczone', 'password']);
// Far deeper than any real payload, and well below what the recursive checks below can handle
const MAX_DEPTH = 32;

const getOwn = (value: unknown, key: string): unknown =>
  _.isPlainObject(value) && Object.hasOwn(value as object, key)
    ? (value as Record<string, unknown>)[key]
    : undefined;

const getVariable = (payload: Payload, variable: string): unknown => {
  if (variable === 'documentId') {
    return getOwn(getOwn(payload, 'entry'), 'documentId');
  }

  if (variable.startsWith(ENTRY_FIELD_PREFIX)) {
    return getOwn(getOwn(payload, 'entry'), variable.slice(ENTRY_FIELD_PREFIX.length));
  }

  return EVENT_VARIABLES.has(variable) || ENTRY_VARIABLES.has(variable)
    ? getOwn(payload, variable)
    : undefined;
};

const toText = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * @param onMissing called with each variable the payload has no value for. A saved template only
 * gets there when the payload or the content type changed since it was saved.
 */
export const renderWebhookBody = (
  template: Template,
  payload: Payload,
  onMissing: (variable: string) => void = () => {}
): Template => {
  const resolve = (variable: string) => {
    const value = getVariable(payload, variable);

    if (value === undefined) {
      onMissing(variable);
    }

    return value;
  };

  const renderValue = (value: unknown): unknown => {
    if (typeof value === 'string') {
      const single = SINGLE_PLACEHOLDER.exec(value);

      if (single) {
        return resolve(single[1]) ?? null;
      }

      return value.replace(PLACEHOLDER, (_match, variable: string) => toText(resolve(variable)));
    }

    if (Array.isArray(value)) {
      return value.map(renderValue);
    }

    if (_.isPlainObject(value)) {
      return _.mapValues(value as Template, renderValue);
    }

    return value;
  };

  return renderValue(template) as Template;
};

/*
 * The admin passes these messages to `formatMessage` as default messages, where braces are ICU
 * syntax: they name variables without the `{{ }}` around them.
 */

const listPlaceholders = (value: unknown, depth = 0): string[] => {
  // Levels are the objects and arrays around a value: the root object is the first one
  if (depth >= MAX_DEPTH && (Array.isArray(value) || _.isPlainObject(value))) {
    throw bodyError(`Webhook body can't be nested more than ${MAX_DEPTH} levels deep`);
  }

  if (typeof value === 'string') {
    // An unterminated `{{ entry.title` is not a placeholder: it would be sent as text, unnoticed
    if (/\{\{|\}\}/.test(value.replace(ANY_PLACEHOLDER, ''))) {
      throw bodyError(
        'Webhook body has double braces that do not open and close a variable placeholder'
      );
    }

    return Array.from(value.matchAll(ANY_PLACEHOLDER), (match) => match[1].trim());
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => listPlaceholders(item, depth + 1));
  }

  if (_.isPlainObject(value)) {
    return Object.entries(value as Template).flatMap(([key, item]) => {
      if (/\{\{|\}\}/.test(key)) {
        throw bodyError("Webhook body keys can't hold a variable placeholder");
      }

      return listPlaceholders(item, depth + 1);
    });
  }

  return [];
};

export const getTargetContentTypes = ({ events, contentTypeEvents = {} }: Webhook) => {
  // Events selected for every content type, or none selected yet: no content type in particular
  const uids = Object.keys(contentTypeEvents);

  return events.length > 0 || uids.length === 0 ? null : uids;
};

/**
 * Private as the sanitizer of the event payload sees it: the attribute's `private`, the content
 * type's `options.privateAttributes` or the `api.responses.privateAttributes` config.
 */
const isPrivate = (contentType: ContentTypes[string], field: string) =>
  contentTypesUtils.isPrivateAttribute(contentType as Schema.ContentType, field);

const isSendableField = (contentType: ContentTypes[string], field: string) => {
  const attribute = Object.hasOwn(contentType.attributes, field)
    ? (contentType.attributes[field] as Schema.Attribute.AnyAttribute)
    : undefined;

  return (
    attribute !== undefined &&
    !NON_SCALAR_TYPES.has(attribute.type) &&
    !isPrivate(contentType, field)
  );
};

// The fields every entry has, outside the attributes: only the global config can make them private
const noContentType = (): ContentTypes[string] => ({ attributes: {}, options: {} });

interface ValidateOptions {
  /**
   * Content types whose missing fields are accepted: those a saved, unchanged template already
   * targeted, so it stays editable once a field it uses is removed (the runner logs the missing
   * value). A content type the webhook did not target before is always checked in full.
   */
  allowRemovedFieldsOf?: string[];
}

const validateEntryField = (
  webhook: Webhook,
  field: string,
  contentTypes: ContentTypes,
  { allowRemovedFieldsOf = [] }: ValidateOptions
) => {
  const uids = getTargetContentTypes(webhook);

  if (COMMON_ENTRY_FIELDS.has(field)) {
    // Events for every content type: any of them can be sent, as can none (global config only)
    const targets = [
      noContentType(),
      ...(uids ?? Object.keys(contentTypes))
        .filter((uid) => Object.hasOwn(contentTypes, uid))
        .map((uid) => contentTypes[uid]),
    ];

    if (targets.some((contentType) => isPrivate(contentType, field))) {
      throw bodyError(`Webhook body variable entry.${field} is a private field`);
    }

    return;
  }

  if (uids === null) {
    throw bodyError(
      `Webhook body variable entry.${field} can only be used when the events are selected per content type`
    );
  }

  // A content type that was deleted has no fields to check against
  for (const uid of uids.filter((target) => Object.hasOwn(contentTypes, target))) {
    const contentType = contentTypes[uid];

    if (!Object.hasOwn(contentType.attributes, field)) {
      if (!allowRemovedFieldsOf.includes(uid)) {
        throw bodyError(`Webhook body variable entry.${field} is not a field of ${uid}`);
      }
    } else if (!isSendableField(contentType, field)) {
      throw bodyError(
        `Webhook body variable entry.${field} is not a scalar, non-private field of ${uid}`
      );
    }
  }
};

export const validateWebhookBody = (
  webhook: Webhook,
  contentTypes: ContentTypes,
  options: ValidateOptions = {}
) => {
  const { body, events, contentTypeEvents = {} } = webhook;

  if (body === null || body === undefined) {
    return;
  }

  if (!_.isPlainObject(body)) {
    throw bodyError('Webhook body must be a JSON object');
  }

  const nonEntryEvent = [...events, ...Object.values(contentTypeEvents).flat()].find(
    (event) => !event.startsWith(ENTRY_EVENT_PREFIX)
  );

  for (const variable of new Set(listPlaceholders(body))) {
    const isEntryField = variable.startsWith(ENTRY_FIELD_PREFIX);

    if (!EVENT_VARIABLES.has(variable)) {
      if (!ENTRY_VARIABLES.has(variable) && !isEntryField) {
        throw bodyError(`Webhook body variable ${variable} is not supported`);
      }

      if (nonEntryEvent) {
        throw bodyError(
          `Webhook body variable ${variable} is not available for the event ${nonEntryEvent}`
        );
      }

      if (isEntryField) {
        validateEntryField(
          webhook,
          variable.slice(ENTRY_FIELD_PREFIX.length),
          contentTypes,
          options
        );
      }
    }
  }
};

/**
 * A value of the JSON type the delivered entry has for this attribute, so a receiver that checks
 * types gets the same ones from a test trigger as from a real delivery.
 */
const getSampleValue = (name: string, attribute: Schema.Attribute.AnyAttribute): unknown => {
  switch (attribute.type) {
    case 'integer':
    case 'float':
    case 'decimal':
      return 1;
    // The database returns big integers as strings
    case 'biginteger':
      return '1';
    case 'boolean':
      return true;
    case 'date':
      return '2026-01-01';
    case 'time':
      return '12:00:00.000';
    case 'datetime':
    case 'timestamp':
      return '2026-01-01T12:00:00.000Z';
    case 'json':
      return {};
    case 'blocks':
      return [{ type: 'paragraph', children: [{ type: 'text', text: `Sample ${name}` }] }];
    case 'enumeration':
      return (attribute as Schema.Attribute.Enumeration<string[]>).enum?.[0] ?? null;
    default:
      return `Sample ${name}`;
  }
};

/**
 * What a test trigger renders a body template against: an event built from the schema of the
 * first content type the webhook targets, so that every variable of the template has a value.
 */
export const createSampleEvent = (webhook: Webhook, contentTypes: ContentTypes): Payload => {
  const uid = getTargetContentTypes(webhook)?.find((target) => Object.hasOwn(contentTypes, target));
  const contentType = uid ? contentTypes[uid] : noContentType();

  const fields = Object.entries(contentType.attributes).filter(([name]) =>
    isSendableField(contentType, name)
  );

  return {
    model: uid ? (uid as UID.ContentType).split('.')[1] : 'sample',
    uid: uid ?? 'api::sample.sample',
    entry: {
      ...Object.fromEntries(
        fields.map(([name, attribute]) => [
          name,
          getSampleValue(name, attribute as Schema.Attribute.AnyAttribute),
        ])
      ),
      ..._.omitBy(
        {
          id: 1,
          documentId: 'sample-document-id',
          createdAt: '2026-01-01T12:00:00.000Z',
          updatedAt: '2026-01-01T12:00:00.000Z',
        },
        (_value, field) => isPrivate(contentType, field)
      ),
    },
  };
};

export { BODY_TEMPLATE_FUTURE_FLAG };
