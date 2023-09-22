/**
 * Note: linting will erroneously raise errors if a namespaced type has the same name as on exported by Strapi
 * To work around it, use a pattern such as:
 *
 * import * as ConfigImport from './config'
 * export type Config = typeof ConfigImport
 *
 * which causes linting to see the namespaces correctly.
 */
import * as ConfigImport from './config';

export type Config = typeof ConfigImport;

export * as Attribute from './attributes';
export * as Schema from './schemas';
export * as Plugin from './plugins';
export * from './strapi';
export * as Common from './common';
export * as Namespace from './namespace';
export * as UID from './uid';
export * as Registry from './registry';
