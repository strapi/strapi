/**
 * The `DocumentServicePluginParams` interface represents the various document-service's plugin parameters where the key is the parameter, and the value is the related type.
 *
 * Simply put: it enables the definition of document-service parameters from external plugins.
 *
 * For instance, consider each plugin requires various parameters for their execution, this interface can act as a contract to satisfy this requirement.
 *
 * Note: Currently, the `DocumentServicePluginParams` doesn't have any methods or properties, it's an empty interface. This stands as a placeholder which can be extended or implemented by the plugins as required.
 *
 * @example
 * Here's how `DocumentServicePluginParams` can be used to define parameters for a fictional plugin "Internationalization":
 * ```typescript
 * declare module '@strapi/types' {
 *   export module Shared {
 *     export interface DocumentServicePluginParams {
 *       'locale': string;
 *     }
 *   }
 * }
 * ```
 *
 * @remark This type needs to be reviewed since it's not augmented anywhere yet
 */
export interface DocumentServicePluginParams {}

/**
 * The `EntityServicePluginParams` interface represents the various entity-service's plugin parameters where the key is the parameter, and the value is the related type.
 *
 * Simply put: it enables the definition of entity-service parameters from external plugins.
 *
 * For instance, consider each plugin requires various parameters for their execution, this interface can act as a contract to satisfy this requirement.
 *
 * Note: Currently, the `EntityServicePluginParams` doesn't have any methods or properties, it's an empty interface. This stands as a placeholder which can be extended or implemented by the plugins as required.
 *
 * @example
 * Here's how `EntityServicePluginParams` can be used to define parameters for a fictional plugin "Internationalization":
 * ```typescript
 * declare module '@strapi/types' {
 *   export module Shared {
 *     export interface EntityServicePluginParams {
 *       'locale': string;
 *     }
 *   }
 * }
 * ```
 *
 * @remark This type needs to be reviewed since it's not augmented anywhere yet
 *
 * @deprecated The entity service is deprecated and will be removed in v6. Use the document service instead.
 */
export interface EntityServicePluginParams {}

/**
 * @remark This type needs to be reviewed since it's not augmented anywhere yet
 *
 * @deprecated
 */
export interface PluginActivation {
  [key: keyof any]: unknown;
}
