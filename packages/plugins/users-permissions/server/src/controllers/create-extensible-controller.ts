import type { Core } from '@strapi/types';
import type { PluginContext } from '../types';

type ControllerFactory<TActions extends Core.Controller> = (context: PluginContext) => TActions;

/** Build the stock actions of one extensible controller for a Strapi instance. */
type StockActionsBuilder = (strapi: Core.Strapi) => void;

const stockActionsBuilders = new Set<StockActionsBuilder>();

/**
 * Build the stock actions of every extensible controller for this Strapi instance.
 *
 * An extension can replace a controller factory with a plain object that spreads it
 * (`{ ...plugin.controllers.user, me }`). Core then never calls the factory, so the copied stock
 * delegates have no instantiated controller to call. The plugin `register` lifecycle runs after
 * extensions are applied and before the server handles requests, so it calls this function to
 * give those delegates a controller.
 */
export const instantiateStockActions = (strapi: Core.Strapi) => {
  for (const build of stockActionsBuilders) {
    build(strapi);
  }
};

/**
 * Keep the plain-object extension contract of a controller that is now built by a factory.
 *
 * `src/extensions/users-permissions/strapi-server` runs before core instantiates controllers and
 * reads, wraps, replaces or adds actions on `plugin.controllers.<name>`. Core ignores properties
 * set on a factory function, so this wrapper:
 * - exposes every stock action on the factory as an enumerable delegate to the instantiated
 *   controller, so an extension can read, wrap or spread it;
 * - keeps the actions an extension assigns on the factory and merges them over the stock actions
 *   when core instantiates the controller.
 *
 * Spreading the factory (`{ ...plugin.controllers.user, me }`) copies the stock delegates and the
 * added actions. Core uses that plain object as is, so the delegates call the stock actions that
 * `instantiateStockActions` builds in the plugin `register` lifecycle.
 */
export const createExtensibleController = <TActions extends Core.Controller>(
  factory: ControllerFactory<TActions>
) => {
  const replacedActions: Core.Controller = {};
  let stockActions: TActions | undefined;

  // Factories only build closures over `strapi`, so a placeholder context lists their actions.
  const stockActionNames = Object.keys(factory({ strapi: undefined as unknown as Core.Strapi }));

  const controller = (context: PluginContext): TActions => {
    stockActions = factory(context);

    // Stock action names are enumerable delegates on the factory, so keep only the added actions.
    const addedActions = Object.fromEntries(
      Object.entries(controller).filter(([actionName]) => !stockActionNames.includes(actionName))
    );

    return { ...stockActions, ...addedActions, ...replacedActions };
  };

  stockActionsBuilders.add((strapi) => {
    stockActions = factory({ strapi });
  });

  const getStockActions = (): TActions => {
    if (stockActions === undefined) {
      throw new Error('users-permissions controller actions run only after Strapi instantiates it');
    }

    return stockActions;
  };

  for (const actionName of stockActionNames) {
    const callStockAction: Core.ControllerHandler = (ctx, next) =>
      getStockActions()[actionName](ctx, next);

    Object.defineProperty(controller, actionName, {
      configurable: true,
      enumerable: true,
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
