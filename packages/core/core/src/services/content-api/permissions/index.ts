import _ from 'lodash';
import { contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Core, Modules, UID } from '@strapi/types';
import {
  createActionProvider,
  createConditionProvider,
  createSyntheticActionProvider,
} from './providers';
import createPermissionEngine from './engine';
import { createEntryCheck } from './assert-entry';
import { createWrittenCheck } from './assert-written';
import { createWriteStatus } from './write-status';
import { createPermissionChecker } from './checker';
import { appliesTo, evaluateCondition, freezeConditionDefinition } from './conditions';
import { describePermissions } from './describe';
import * as explain from './explain';
import { compiledPermissionsOf, createAbilityGenerator, isSubjectAware } from './generate-ability';
import { contentTypeUidOfAction } from './materialize';
import { SINGLE_TYPE_CREATE, SYNTHETIC_ACTIONS } from './types';

type PermissionUtilities = Modules.ContentAPI.PermissionUtilities;

const typeSymbol = Symbol.for('__type__');

interface ValidatePermissionHandler {
  (params: { permission: { action: string } }): boolean;
}

/**
 * Creates a handler that checks if the permission's action exists in the action registry
 */
const createValidatePermissionHandler =
  (actionProvider: ReturnType<typeof createActionProvider>): ValidatePermissionHandler =>
  ({ permission }) => {
    const action = actionProvider.get(permission.action);

    // If the action isn't registered into the action provider, then ignore the permission and warn the user
    if (!action) {
      strapi.log.debug(
        `Unknown action "${permission.action}" supplied when registering a new permission`
      );

      return false;
    }

    return true;
  };

/**
 * Create instances of providers and permission engine for the core content-API service.
 * Also, expose utilities to get information about available actions and such.
 */
export default (strapi: Core.Strapi) => {
  const providers = {
    action: createActionProvider(),
    // `read-drafts` and `publish`: data actions no controller backs, kept out of `action`, whose
    // keys are what API tokens may be granted
    syntheticAction: createSyntheticActionProvider(),
    condition: createConditionProvider(),
  };

  const contentTypes = () => strapi.contentTypes ?? {};

  /**
   * The content type whose controller owns the action: `api::note.note` for
   * `api::note.note.find`, null for `plugin::end-users.me.find` or a custom API without one.
   */
  const subjectOf: PermissionUtilities['subjectOf'] = (action: string): UID.ContentType | null => {
    const uid = contentTypeUidOfAction(action);

    if (uid === null) {
      return null;
    }

    // One lookup of the one uid: reading `strapi.contentTypes` builds the map of every schema each
    // time. The registry is a plain object, so a key like `constructor` finds an inherited value;
    // only a schema that names itself by the uid counts.
    const contentType: { uid?: unknown } | undefined = strapi.contentType(uid as UID.ContentType);

    return contentType?.uid === uid ? (uid as UID.ContentType) : null;
  };

  /**
   * Get a tree representation of the available Content API actions
   * based on the methods of the Content API controllers.
   *
   * @note Only actions bound to a content-API route are returned.
   */
  const getActionsMap = () => {
    const actionMap: Record<
      string,
      {
        controllers: Record<string, string[]>;
      }
    > = {};

    /**
     * Check if a controller's action is bound to the
     * content-api by looking at a potential __type__ symbol
     */
    const isContentApi = (action: Core.ControllerHandler & { [s: symbol]: any }) => {
      if (!_.has(action, typeSymbol)) {
        return false;
      }

      return action[typeSymbol].includes('content-api');
    };

    /**
     * Register actions from a specific API source into the result tree
     */
    const registerAPIsActions = (
      apis: Record<string, Core.Plugin | Core.Module>,
      source: 'api' | 'plugin'
    ) => {
      for (const [apiName, api] of Object.entries(apis ?? {})) {
        const controllers = _.reduce(
          api.controllers,
          (acc, controller, controllerName) => {
            const contentApiActions = _.pickBy(controller, isContentApi);

            if (_.isEmpty(contentApiActions)) {
              return acc;
            }

            acc[controllerName] = Object.keys(contentApiActions);

            return acc;
          },
          {} as Record<string, string[]>
        );

        if (!_.isEmpty(controllers)) {
          actionMap[`${source}::${apiName}`] = { controllers };
        }
      }
    };

    registerAPIsActions(strapi.apis, 'api');
    registerAPIsActions(strapi.plugins, 'plugin');

    return actionMap;
  };

  /**
   * Register all the content-API controllers actions into the action provider.
   * This method make use of the {@link getActionsMap} to generate the list of actions to register.
   *
   * Then register `<uid>.read-drafts` and `<uid>.publish` into the synthetic action provider for
   * every content type with draft & publish.
   */
  const registerActions = async () => {
    const actionsMap = getActionsMap();

    // For each API
    for (const [api, value] of Object.entries(actionsMap)) {
      const { controllers } = value;

      // Register controllers methods as actions
      for (const [controller, actions] of Object.entries(controllers)) {
        // Register each action individually
        await Promise.all(
          actions.map((action) => {
            const actionUID = `${api}.${controller}.${action}`;

            return providers.action.register(actionUID, {
              api,
              controller,
              action,
              uid: actionUID,
            });
          })
        );
      }
    }

    // Reading drafts and publishing, for each content type with draft & publish; creating, for
    // each single type: its first document is created by the `update` route, so who may create it
    // and the owner it is stamped with are a `create` row's, which no controller backs
    for (const [uid, contentType] of Object.entries(contentTypes())) {
      const actions: string[] = [
        ...(contentTypesUtils.hasDraftAndPublish(contentType) ? SYNTHETIC_ACTIONS : []),
        ...(contentTypesUtils.isSingleType(contentType) ? [SINGLE_TYPE_CREATE] : []),
      ];

      await Promise.all(
        actions.map((action) => {
          const actionUID = `${uid}.${action}`;

          return providers.syntheticAction.register(actionUID, {
            subject: uid,
            action,
            uid: actionUID,
          });
        })
      );
    }
  };

  // Create an instance of a content-API permission engine
  // and binds a custom validation handler to it
  const engine = createPermissionEngine({ providers });

  engine.on(
    'before-format::validate.permission',
    createValidatePermissionHandler(providers.action)
  );

  const generateAbility: PermissionUtilities['generateAbility'] = createAbilityGenerator({
    engine,
    providers,
    getContentTypes: contentTypes,
  });

  // What a condition editor asks about a definition it holds: none of it registers anything, so it
  // works after load
  const conditions: PermissionUtilities['conditions'] = {
    validate: freezeConditionDefinition,
    evaluate: (definition, params, ctx) =>
      evaluateCondition(definition, params, { ...ctx, now: new Date() }),
    appliesTo,
    readsProfile: () =>
      providers.condition.values().some((definition) => definition.usesProfile === true),
  };

  // What the Content API sanitizers and validators ask about a caller's data rules
  const checker: PermissionUtilities['checker'] = createPermissionChecker({ providers });

  // The stored-entry check before writes, which the Document Service doesn't filter
  const { entryMatches, assertEntry } = createEntryCheck({ strapi, checker });

  // The data a create or update wrote, judged in the transaction that wrote it
  const { assertWritten } = createWrittenCheck({ strapi, checker });

  // Who may publish: a write is a draft without the `publish` action
  const { resolveWriteStatus, publishIfAllowed } = createWriteStatus({
    strapi,
    checker,
    entryMatches,
  });

  return {
    engine,
    providers,
    conditions,
    registerActions,
    getActionsMap,
    generateAbility,
    isSubjectAware: isSubjectAware satisfies PermissionUtilities['isSubjectAware'],
    subjectOf,
    checker,
    describe: describePermissions satisfies PermissionUtilities['describe'],
    readExplain: ((auth) =>
      explain.read(compiledPermissionsOf(auth))) satisfies PermissionUtilities['readExplain'],
    entryMatches,
    assertEntry,
    assertWritten,
    resolveWriteStatus,
    publishIfAllowed,
  };
};
