import type { Schema } from '@strapi/types';

import { isDiskSource } from './brand';
import type { AppComponent, AppContentType, AppInput } from './types';
import type { DiskSource } from './sources';

/** Attribute types that have a matching `is.*` builder in `@strapi/strapi/attributes`. */
export const ATTRIBUTE_BUILDERS: Record<string, string> = {
  string: 'string',
  text: 'text',
  richtext: 'richtext',
  blocks: 'blocks',
  email: 'email',
  password: 'password',
  integer: 'integer',
  biginteger: 'biginteger',
  float: 'float',
  decimal: 'decimal',
  boolean: 'boolean',
  date: 'date',
  time: 'time',
  datetime: 'datetime',
  timestamp: 'timestamp',
  json: 'json',
  enumeration: 'enumeration',
  uid: 'uid',
  media: 'media',
  component: 'component',
  relation: 'relation',
};

const INDENT = '  ';

const quote = (value: string): string => JSON.stringify(value);

const formatValue = (value: unknown, depth = 0): string => {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'string') {
    return quote(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const pad = INDENT.repeat(depth + 1);
    const items = value.map((item) => `${pad}${formatValue(item, depth + 1)}`).join(',\n');
    return `[\n${items},\n${INDENT.repeat(depth)}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    const pad = INDENT.repeat(depth + 1);
    const props = entries
      .map(([key, val]) => {
        const keyStr = /^[a-zA-Z_$][\w$]*$/.test(key) ? key : quote(key);
        return `${pad}${keyStr}: ${formatValue(val, depth + 1)}`;
      })
      .join(',\n');
    return `{\n${props},\n${INDENT.repeat(depth)}}`;
  }
  return 'undefined';
};

const formatAttribute = (attribute: Schema.Attribute.AnyAttribute, depth: number): string => {
  const { type, ...opts } = attribute as Record<string, unknown>;
  const builder = typeof type === 'string' ? ATTRIBUTE_BUILDERS[type] : undefined;

  if (builder) {
    const optsStr = formatValue(opts, depth + 1);
    return optsStr === '{}' ? `is.${builder}()` : `is.${builder}(${optsStr})`;
  }

  return formatValue(attribute, depth);
};

const formatAttributes = (
  attributes: Record<string, Schema.Attribute.AnyAttribute>,
  depth: number
): string => {
  const pad = INDENT.repeat(depth + 1);
  const props = Object.entries(attributes)
    .map(([name, attr]) => `${pad}${quote(name)}: ${formatAttribute(attr, depth + 1)}`)
    .join(',\n');
  return `{\n${props},\n${INDENT.repeat(depth)}}`;
};

const formatContentType = (ct: AppContentType, depth: number): string => {
  const pad = INDENT.repeat(depth + 1);
  const lines: string[] = [
    `${pad}singularName: ${quote(ct.singularName)}`,
    `${pad}pluralName: ${quote(ct.pluralName)}`,
    `${pad}displayName: ${quote(ct.displayName)}`,
    `${pad}attributes: ${formatAttributes(ct.attributes, depth + 1)}`,
  ];

  if (ct.kind && ct.kind !== 'collectionType') {
    lines.push(`${pad}kind: ${quote(ct.kind)}`);
  }
  if (ct.collectionName) {
    lines.push(`${pad}collectionName: ${quote(ct.collectionName)}`);
  }
  if (ct.description) {
    lines.push(`${pad}description: ${quote(ct.description)}`);
  }
  if (ct.apiName) {
    lines.push(`${pad}apiName: ${quote(ct.apiName)}`);
  }
  if (ct.options && Object.keys(ct.options).length > 0) {
    lines.push(`${pad}options: ${formatValue(ct.options, depth + 1)}`);
  }
  if (ct.pluginOptions && Object.keys(ct.pluginOptions).length > 0) {
    lines.push(`${pad}pluginOptions: ${formatValue(ct.pluginOptions, depth + 1)}`);
  }
  if (ct.api === false) {
    lines.push(`${pad}api: false`);
  }

  return `{\n${lines.join(',\n')},\n${INDENT.repeat(depth)}}`;
};

const formatComponent = (component: AppComponent, depth: number): string => {
  const pad = INDENT.repeat(depth + 1);
  const lines: string[] = [
    `${pad}uid: ${quote(component.uid)}`,
    `${pad}displayName: ${quote(component.displayName)}`,
    `${pad}attributes: ${formatAttributes(component.attributes, depth + 1)}`,
  ];

  if (component.collectionName) {
    lines.push(`${pad}collectionName: ${quote(component.collectionName)}`);
  }
  if (component.description) {
    lines.push(`${pad}description: ${quote(component.description)}`);
  }
  if (component.icon) {
    lines.push(`${pad}icon: ${quote(component.icon)}`);
  }
  if (component.options && Object.keys(component.options).length > 0) {
    lines.push(`${pad}options: ${formatValue(component.options, depth + 1)}`);
  }

  return `defineComponent({\n${lines.join(',\n')},\n${INDENT.repeat(depth)}})`;
};

const formatFromDisk = (disk: DiskSource): string => `fromDisk(${quote(disk.path)})`;

export interface PrintDefineAppSourceOptions {
  /** Emit `recommendedPlugins()` instead of `fromDisk()` when plugins were empty on disk. */
  useRecommendedPlugins?: boolean;
  warnings?: string[];
}

/**
 * Turn an {@link AppInput} (typically from {@link scaffoldToDefineApp}) into a
 * single TypeScript module that exports `defineApp(...)`.
 */
export const printDefineAppSource = (
  definition: AppInput,
  options: PrintDefineAppSourceOptions = {}
): string => {
  const { useRecommendedPlugins = false, warnings = [] } = options;
  const imports = useRecommendedPlugins
    ? [
        "import { defineApp, defineComponent, fromDisk } from '@strapi/strapi';",
        "import { recommendedPlugins } from '@strapi/strapi/plugins';",
        "import * as is from '@strapi/strapi/attributes';",
      ]
    : [
        "import { defineApp, defineComponent, fromDisk } from '@strapi/strapi';",
        "import * as is from '@strapi/strapi/attributes';",
      ];

  const lines: string[] = [...imports];

  lines.push('', 'export default defineApp({');

  const body: string[] = [];

  if (definition.config && isDiskSource(definition.config)) {
    body.push(`${INDENT}config: ${formatFromDisk(definition.config)},`);
  }

  if (definition.plugins) {
    if (useRecommendedPlugins) {
      body.push(`${INDENT}plugins: recommendedPlugins(),`);
    } else if (isDiskSource(definition.plugins)) {
      body.push(`${INDENT}plugins: ${formatFromDisk(definition.plugins)},`);
    }
  } else if (useRecommendedPlugins) {
    body.push(`${INDENT}plugins: recommendedPlugins(),`);
  }

  if (Array.isArray(definition.contentTypes) && definition.contentTypes.length > 0) {
    const cts = definition.contentTypes
      .map((ct) => `${INDENT.repeat(2)}${formatContentType(ct, 2)}`)
      .join(',\n');
    body.push(`${INDENT}contentTypes: [\n${cts},\n${INDENT}],`);
  }

  if (Array.isArray(definition.components) && definition.components.length > 0) {
    const comps = definition.components
      .map((c) => `${INDENT.repeat(2)}${formatComponent(c, 2)}`)
      .join(',\n');
    body.push(`${INDENT}components: [\n${comps},\n${INDENT}],`);
  }

  if (definition.policies && isDiskSource(definition.policies)) {
    body.push(`${INDENT}policies: ${formatFromDisk(definition.policies)},`);
  }

  if (definition.middlewares && isDiskSource(definition.middlewares)) {
    body.push(`${INDENT}middlewares: ${formatFromDisk(definition.middlewares)},`);
  }

  if (definition.from && isDiskSource(definition.from)) {
    body.push(`${INDENT}from: ${formatFromDisk(definition.from)},`);
  }

  lines.push(...body);
  lines.push('});');

  if (warnings.length > 0) {
    lines.push('');
    lines.push('/*');
    for (const warning of warnings) {
      lines.push(` * ${warning}`);
    }
    lines.push(' */');
  }

  lines.push('');
  return lines.join('\n');
};
