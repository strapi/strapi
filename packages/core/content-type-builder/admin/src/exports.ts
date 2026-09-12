export {
  /**
   * @private
   * @description This hook is private and should only be used internally.
   * Pending a refactor to a more generic reload watcher outside of the content
   * type builder.
   */
  useAutoReloadOverlayBlocker as private_useAutoReloadOverlayBlocker,
  /**
   * @private
   * @description This provider is private and should only be used internally.
   * Pending a refactor to a more generic reload watcher outside of the content
   * type builder.
   */
  AutoReloadOverlayBlockerProvider as private_AutoReloadOverlayBlockerProvider,
} from './components/AutoReloadOverlayBlocker';

export {
  /**
   * @description Lets a plugin put the Content-Type Builder in read-only mode
   * from runtime context (the schema stays browsable, editing is disabled and
   * the rule's reason is shown). See `components/DataManager/readOnlyRules.ts`.
   */
  registerReadOnlyRule,
  registerAvailabilityRule,
} from './components/DataManager/readOnlyRules';
export type { ReadOnlyRule, ReadOnlyState } from './components/DataManager/readOnlyRules';
export {
  /**
   * @description Lets a plugin add a column, and a filter, to the schema index
   * for the option it owns — i18n for `localized`, workspaces for `visibleIn`.
   * See `pages/SchemaIndex/schemaRegistry.ts`.
   */
  registerSchemaColumn,
  registerSchemaFilter,
} from './pages/SchemaIndex/schemaRegistry';
export type { SchemaColumn, SchemaFilter } from './pages/SchemaIndex/schemaRegistry';
export {
  /**
   * @description Lets a plugin add a flag to a field's row for the option it
   * owns — i18n for `localized`. The builder registers its own three
   * (required, unique, private). See `components/attributeFlags.ts`.
   */
  registerAttributeFlag,
} from './components/attributeFlagRegistry';
export type { AttributeFlag } from './components/attributeFlagRegistry';
export {
  /**
   * @description The way the schema index draws a yes-or-no option, for the
   * plugins that contribute a column of one. See `components/SchemaOption.tsx`.
   */
  SchemaOption,
} from './components/SchemaOption';
