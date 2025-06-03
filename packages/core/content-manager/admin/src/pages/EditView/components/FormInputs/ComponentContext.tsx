import { createContext } from '@strapi/admin/strapi-admin';

interface ComponentContextValue {
  /**
   * The id of the component. It will be undefined if the component
   * has not been created in the database yet. This could be on a new
   * or existing entry.
   */
  id?: number;
  /**
   * The level of the component. This is used to determine the nesting
   * of the component. The default is set to -1 so that the base level is 0
   * for the top level component, and increases by 1 for each level of nesting.
   */
  level: number;
  /**
   * The uid of the component. This is used to determine the type of the
   * component. Within an attribute, it is normally the `component` value.
   * It will be undefined if the hook is not called within the confines
   * of a provider.
   */
  uid?: string;
  /**
   * The type of component parent. It will be undefined if the hook
   * is not called within the confines of a provider.
   */
  type?: 'dynamiczone' | 'repeatable' | 'component';
}

/**
 * We use this component to wrap any individual component field in the Edit View,
 * this could be a component field in a dynamic zone, a component within a repeatable space,
 * or even nested components.
 *
 * We primarily need this to provide the component id to the components so that they can
 * correctly fetch their relations.
 */
const [ComponentProvider, useComponent] = createContext<ComponentContextValue>('ComponentContext', {
  id: undefined,
  level: -1,
  uid: undefined,
  type: undefined,
});

export { ComponentProvider, useComponent };
