import type { Core } from '@strapi/types';
import { hooks } from '@strapi/utils';

import { warnLateRegistration } from './late-registration';

type LifecycleHook = {
  register(handler: hooks.Handler): unknown;
  call(context?: unknown): Promise<unknown>;
};

type LifecycleHookWindow = {
  uid: string;
  createHook: () => LifecycleHook;
  /**
   * When registering a handler stops working. A parallel hook calls the handlers registered when
   * the call starts. A series hook also calls the handlers that its handlers register, until the
   * call ends.
   */
  closesWhen: 'call-starts' | 'call-ends';
  /** When Strapi calls the hook, as it reads after "Strapi called this hook". */
  calledAt: string;
  /** Where to register a handler instead, as it reads after "Register it". */
  registerIn: string;
};

/**
 * The hooks Strapi calls once per boot, during bootstrap: before and after the database schema
 * sync, and once every module, provider and the app have bootstrapped.
 */
const LIFECYCLE_HOOKS: LifecycleHookWindow[] = [
  {
    uid: 'strapi::content-types.beforeSync',
    createHook: hooks.createAsyncParallelHook,
    closesWhen: 'call-starts',
    calledAt: 'during the database schema sync',
    registerIn: 'from a register function',
  },
  {
    uid: 'strapi::content-types.afterSync',
    createHook: hooks.createAsyncParallelHook,
    closesWhen: 'call-starts',
    calledAt: 'during the database schema sync',
    registerIn: 'from a register function',
  },
  {
    uid: 'strapi::app.afterBootstrap',
    createHook: hooks.createAsyncSeriesHook,
    closesWhen: 'call-ends',
    calledAt: 'at the end of bootstrap',
    registerIn: 'from a register or bootstrap function',
  },
];

/**
 * Warns (development only, see {@link warnLateRegistration}) when a handler is registered after
 * the hook's call closed its window: Strapi calls the hook once per boot, so it never calls that
 * handler. Registering and calling behave as before.
 */
const warnOnLateHandlers = (
  strapi: Core.Strapi,
  hook: LifecycleHook,
  { uid, closesWhen, calledAt, registerIn }: LifecycleHookWindow
) => {
  let isWindowClosed = false;
  const { register, call } = hook;

  hook.register = function registerHandler(this: LifecycleHook, handler: hooks.Handler) {
    if (isWindowClosed === true) {
      warnLateRegistration(strapi, {
        surface: 'hooks',
        key: uid,
        subject: `A handler of the "${uid}" hook`,
        closedBy: `Strapi called this hook ${calledAt}`,
        effect: 'Strapi does not call it',
        registerIn,
      });
    }

    return register.call(this, handler);
  };

  hook.call = function callHandlers(this: LifecycleHook, context?: unknown) {
    if (closesWhen === 'call-starts') {
      isWindowClosed = true;
      return call.call(this, context);
    }

    return call.call(this, context).then((result) => {
      isWindowClosed = true;
      return result;
    });
  };
};

/**
 * Sets the hooks Strapi calls during bootstrap. Each one warns about handlers registered after
 * Strapi called it.
 */
export const setLifecycleHooks = (strapi: Core.Strapi) => {
  for (const lifecycleHook of LIFECYCLE_HOOKS) {
    const hook = lifecycleHook.createHook();
    warnOnLateHandlers(strapi, hook, lifecycleHook);
    strapi.get('hooks').set(lifecycleHook.uid, hook);
  }
};
