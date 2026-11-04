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
import { errors } from '@strapi/utils';
import type { Modules, Schema, UID } from '@strapi/types';

type Payload = Record<string, unknown>;
type Template = Record<string, unknown>;
type Webhook = Modules.WebhookStore.Webhook;
export type ContentTypes = Record<string, Pick<Schema.ContentType, 'attributes'>>;

const { ValidationError } = errors;

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

const listPlaceholders = (value: unknown): string[] => {
  if (typeof value === 'string') {
    // An unterminated `{{ entry.title` is not a placeholder: it would be sent as text, unnoticed
    if (/\{\{|\}\}/.test(value.replace(ANY_PLACEHOLDER, ''))) {
      throw new ValidationError(
        'Webhook body has a "{{" or "}}" that is not part of a {{ variable }} placeholder'
      );
    }

    return Array.from(value.matchAll(ANY_PLACEHOLDER), (match) => match[1].trim());
  }

  if (Array.isArray(value)) {
    return value.flatMap(listPlaceholders);
  }

  if (_.isPlainObject(value)) {
    return Object.entries(value as Template).flatMap(([key, item]) => {
      if (listPlaceholders(key).length > 0) {
        throw new ValidationError(`Webhook body keys can't hold a variable: ${key}`);
      }

      return listPlaceholders(item);
    });
  }

  return [];
};

const getTargetContentTypes = ({ events, contentTypeEvents = {} }: Webhook) => {
  // Events selected for every content type, or none selected yet: no content type in particular
  const uids = Object.keys(contentTypeEvents);

  return events.length > 0 || uids.length === 0 ? null : uids;
};

const isSendableField = (contentType: ContentTypes[string], field: string) => {
  const attribute = Object.hasOwn(contentType.attributes, field)
    ? (contentType.attributes[field] as Schema.Attribute.AnyAttribute & { private?: boolean })
    : undefined;

  return (
    attribute !== undefined && !NON_SCALAR_TYPES.has(attribute.type) && attribute.private !== true
  );
};

const validateEntryField = (webhook: Webhook, field: string, contentTypes: ContentTypes) => {
  if (COMMON_ENTRY_FIELDS.has(field)) {
    return;
  }

  const uids = getTargetContentTypes(webhook);

  if (uids === null) {
    throw new ValidationError(
      `Webhook body variable {{ entry.${field} }} can only be used when the events are selected per content type`
    );
  }

  // A content type that was deleted has no fields to check against
  const invalidUid = uids.find(
    (uid) => Object.hasOwn(contentTypes, uid) && !isSendableField(contentTypes[uid], field)
  );

  if (invalidUid) {
    throw new ValidationError(
      `Webhook body variable {{ entry.${field} }} is not a scalar field of ${invalidUid}`
    );
  }
};

export const validateWebhookBody = (webhook: Webhook, contentTypes: ContentTypes) => {
  const { body, events, contentTypeEvents = {} } = webhook;

  if (body === null || body === undefined) {
    return;
  }

  if (!_.isPlainObject(body)) {
    throw new ValidationError('Webhook body must be a JSON object');
  }

  const nonEntryEvent = [...events, ...Object.values(contentTypeEvents).flat()].find(
    (event) => !event.startsWith(ENTRY_EVENT_PREFIX)
  );

  for (const variable of new Set(listPlaceholders(body))) {
    const isEntryField = variable.startsWith(ENTRY_FIELD_PREFIX);

    if (!EVENT_VARIABLES.has(variable)) {
      if (!ENTRY_VARIABLES.has(variable) && !isEntryField) {
        throw new ValidationError(`Webhook body variable {{ ${variable} }} is not supported`);
      }

      if (nonEntryEvent) {
        throw new ValidationError(
          `Webhook body variable {{ ${variable} }} is not available for the event ${nonEntryEvent}`
        );
      }

      if (isEntryField) {
        validateEntryField(webhook, variable.slice(ENTRY_FIELD_PREFIX.length), contentTypes);
      }
    }
  }
};

const getSampleValue = (name: string, { type }: Schema.Attribute.AnyAttribute): unknown => {
  switch (type) {
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
      return 1;
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
  const attributes = uid ? contentTypes[uid].attributes : {};

  const fields = Object.entries(attributes).filter(([name]) =>
    isSendableField({ attributes }, name)
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
      id: 1,
      documentId: 'sample-document-id',
      createdAt: '2026-01-01T12:00:00.000Z',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
  };
};

export { BODY_TEMPLATE_FUTURE_FLAG };
