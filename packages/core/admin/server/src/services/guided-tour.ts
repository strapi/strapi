import { Core, Internal } from '@strapi/types';
import constants from './constants';

export type GuidedTourRequiredActions = {
  didCreateContent: boolean;
  didCreateApiToken: boolean;
};
export type GuidedTourCompletedActions = keyof GuidedTourRequiredActions;

export const createGuidedTourService = ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * @internal
   * TODO:
   * Remove this service and handle everything on the frontend
   */
  const getCompletedActions = async () => {
    // Check if any content-type schemas have been created on the api:: namespace
    const contentTypeSchemaNames = Object.keys(strapi.contentTypes).filter((contentTypeUid) =>
      contentTypeUid.startsWith('api::')
    );
    // Check if any content has been created for content-types on the api:: namespace
    const hasContent = await (async () => {
      for (const name of contentTypeSchemaNames) {
        const count = await strapi.documents(name as Internal.UID.ContentType).count({});

        if (count > 0) return true;
      }

      return false;
    })();
    const didCreateContent = hasContent;

    // Check if any api tokens have been created besides the default ones
    const createdApiTokens = await strapi
      .documents('admin::api-token')
      .findMany({ fields: ['name', 'description'] });
    const didCreateApiToken = createdApiTokens.some((doc) =>
      constants.DEFAULT_API_TOKENS.every(
        (token) => token.name !== doc.name && token.description !== doc.description
      )
    );

    // Compute an array of action names that have been completed
    const requiredActions = {
      didCreateContent,
      didCreateApiToken,
    };
    const requiredActionNames = Object.keys(requiredActions) as Array<GuidedTourCompletedActions>;
    const completedActions = requiredActionNames.filter((key) => requiredActions[key]);

    return completedActions;
  };

  return {
    getCompletedActions,
  };
};
