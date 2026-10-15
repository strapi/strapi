import type { Core } from '@strapi/types';
import type { PluginContext } from '../types';

type ControllerFactory<TActions extends Core.Controller> = (context: PluginContext) => TActions;

/**
 * Keep the plain-object extension contract of a controller that is now built by a factory.
 *
 * `src/extensions/users-permissions/strapi-server` runs before core instantiates controllers and
 * reads, wraps, replaces or adds actions on `plugin.controllers.<name>`. Core ignores properties
 * set on a factory function, so this wrapper:
 * - exposes every stock action on the factory as a delegate to the instantiated controller, so an
 *   extension can read and wrap it;
 * - keeps the actions an extension assigns on the factory and merges them over the stock actions
 *   when core instantiates the controller.
 *
 * Spreading the factory (`{ ...plugin.controllers.user }`) copies only the added actions. Wrap the
 * factory instead, as the plugin-extension documentation describes for the `auth` controller.
 */
export const createExtensibleController = <TActions extends Core.Controller>(
  factory: ControllerFactory<TActions>
) => {
  const replacedActions: Core.Controller = {};
  let stockActions: TActions | undefined;

  const controller = (context: PluginContext): TActions => {
    stockActions = factory(context);

    // Own enumerable properties are the actions extensions added under new names.
    return { ...stockActions, ...replacedActions, ...controller };
  };

  const getStockActions = (): TActions => {
    if (stockActions === undefined) {
      throw new Error('users-permissions controller actions run only after Strapi instantiates it');
    }

    return stockActions;
  };

  // Factories only build closures over `strapi`, so a placeholder context lists their actions.
  const stockActionNames = Object.keys(factory({ strapi: undefined as unknown as Core.Strapi }));

  for (const actionName of stockActionNames) {
    const callStockAction: Core.ControllerHandler = (ctx, next) =>
      getStockActions()[actionName](ctx, next);

    Object.defineProperty(controller, actionName, {
      configurable: true,
      enumerable: false,
      get() {
        return replacedActions[actionName] ?? callStockAction;
      },
      set(action: Core.ControllerHandler) {
        replacedActions[actionName] = action;
      },
    });
  }

  // Every stock action is defined on the factory by the loop above.
  return controller as ControllerFactory<TActions> & TActions;
};
