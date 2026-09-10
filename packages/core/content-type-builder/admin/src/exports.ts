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
