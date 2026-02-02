import { eq } from 'lodash/fp';
import { hooks } from '@strapi/utils';
import type { Action } from '../../../domain/action';

export type SectionOptions = {
  initialStateFactory?: (...args: any) => unknown; // A factory function that returns the default shape of the section
  handlers?: ((...args: any) => unknown)[]; // An initial collection of handlers which will be registered in the handlers hook
  matchers?: ((...args: any) => unknown)[]; // An initial collection of matchers which will be registered in the matchers hook
};

const emptyObjectFactory = () => ({});

/**
 * Upon call, creates a new section object
 */
const createSection = (
  { initialStateFactory = emptyObjectFactory, handlers = [], matchers = [] } = {} as SectionOptions
) => {
  const state = {
    hooks: {
      handlers: hooks.createAsyncSeriesHook(),
      matchers: hooks.createAsyncParallelHook(),
    },
  };

  // Register initial hooks
  handlers.forEach((handler) => state.hooks.handlers.register(handler));
  matchers.forEach((matcher) => state.hooks.matchers.register(matcher));

  return {
    hooks: state.hooks,

    /**
     * Verifies if an action can be applied to the section by running the matchers hook.
     * If any of the registered matcher functions returns true, then the condition applies.
     */
    async appliesToAction(action: Action): Promise<boolean> {
      const results = await state.hooks.matchers.call(action);

      return results.some(eq(true));
    },

    /**
     * Init, build and returns a section object based on the given actions
     * @param  actions - A list of actions used to populate the section
     */
    async build(actions = [] as Action[]) {
      const section = initialStateFactory();

      for (const action of actions) {
        const applies = await this.appliesToAction(action);

        if (applies) {
          await state.hooks.handlers.call({ action, section });
        }
      }

      return section;
    },
  };
};

export default createSection;
