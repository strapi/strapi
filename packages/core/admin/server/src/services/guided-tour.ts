import { Core, Internal } from '@strapi/types';

export type GuidedTourRequiredActions = {
  didCreateContent: boolean;
};
export type GuidedTourCompletedActions = keyof GuidedTourRequiredActions;

export const createGuidedTourService = ({ strapi }: { strapi: Core.Strapi }) => {
  /**
   * @internal
   * TODO:
   * Remove completed actions from the server and handle it all on the frontend
   * [x] didCreateContentTypeSchema
   * [ ] didCreateContent
   * [x] didCreateApiToken
   */
  const getCompletedActions = async () => {
    // Check if any content has been created for content-types on the api:: namespace
    const hasContent = await (async () => {
      for (const name of Object.keys(strapi.contentTypes).filter((contentTypeUid) =>
        contentTypeUid.startsWith('api::')
      )) {
        const count = await strapi.documents(name as Internal.UID.ContentType).count({});

        if (count > 0) return true;
      }

      return false;
    })();
    const didCreateContent = hasContent;

    const requiredActions = {
      didCreateContent,
    };
    const requiredActionNames = Object.keys(requiredActions) as Array<GuidedTourCompletedActions>;
    const completedActions = requiredActionNames.filter((key) => requiredActions[key]);

    return completedActions;
  };

  return {
    getCompletedActions,
  };
};
