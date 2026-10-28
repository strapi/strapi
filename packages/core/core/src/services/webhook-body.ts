/**
 * Renders the body template of a webhook against the payload of an event.
 *
 * A template is the JSON object saved on the webhook. Its string values can hold
 * `{{ path }}` placeholders, where `path` is a dot path into the payload, e.g.
 * `{{ event }}` or `{{ entry.title }}`.
 *
 * - A string made of a single placeholder is replaced by the value it points to, as is,
 *   so `"entry": "{{ entry }}"` embeds the whole entry object. A missing value gives `null`.
 * - Placeholders inside a longer string are replaced by their text: strings as is, numbers
 *   and booleans stringified, dates as ISO strings, objects and arrays as JSON. A missing
 *   value gives an empty string.
 * - Object keys are copied as is. Other values (numbers, booleans, null) are copied as is.
 */

import _ from 'lodash';

type Payload = Record<string, unknown>;
type Template = Record<string, unknown>;

const PLACEHOLDER = /\{\{\s*([^{}\s]+)\s*\}\}/g;
const SINGLE_PLACEHOLDER = /^\s*\{\{\s*([^{}\s]+)\s*\}\}\s*$/;

/**
 * Walks the own properties of plain objects and arrays only, so a path can neither
 * reach a prototype member nor a method of a non-plain object (e.g. a Date).
 */
const getPath = (payload: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((value, key) => {
    if ((Array.isArray(value) || _.isPlainObject(value)) && Object.hasOwn(value as object, key)) {
      return (value as Record<string, unknown>)[key];
    }

    return undefined;
  }, payload);
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

const renderValue = (value: unknown, payload: Payload): unknown => {
  if (typeof value === 'string') {
    const single = SINGLE_PLACEHOLDER.exec(value);

    if (single) {
      return getPath(payload, single[1]) ?? null;
    }

    return value.replace(PLACEHOLDER, (_match, path: string) => toText(getPath(payload, path)));
  }

  if (Array.isArray(value)) {
    return value.map((item) => renderValue(item, payload));
  }

  if (_.isPlainObject(value)) {
    return _.mapValues(value as Record<string, unknown>, (item) => renderValue(item, payload));
  }

  return value;
};

export const renderWebhookBody = (template: Template, payload: Payload): Template => {
  return renderValue(template, payload) as Template;
};
