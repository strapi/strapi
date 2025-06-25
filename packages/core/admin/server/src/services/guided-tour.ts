import { Core, Internal } from '@strapi/types';

export type GuidedTourRequiredActions = {
  didCreateContentTypeSchema: boolean;
  didCreateContent: boolean;
  didCreateApiToken: boolean;
};
export type GuidedTourCompletedActions = keyof GuidedTourRequiredActions;

export const createGuidedTourService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getCompletedActions = async () => {
    // Check if any content-type schemas have been create on the api:: namespace
    const contentTypeSchemaNames = Object.keys(strapi.contentTypes).filter((contentTypeUid) =>
      contentTypeUid.startsWith('api::')
    );
    const didCreateContentTypeSchema = contentTypeSchemaNames.length > 0;

    // Check if any content has been created for content-types on the api:: namespace
    const hasContent = await (async () => {
      for (const name of contentTypeSchemaNames) {
        const count = await strapi.documents(name as Internal.UID.ContentType).count({});
        const res = await strapi.documents(name as Internal.UID.ContentType).findMany({});
        console.dir({ res, count }, { depth: null });
        if (count > 0) return true;
      }

      return false;
    })();
    const didCreateContent = didCreateContentTypeSchema && hasContent;
    console.dir(
      { contentTypeSchemaNames, didCreateContentTypeSchema, hasContent },
      { depth: null }
    );

    // Check if any api tokens have been created besides the default ones
    const DEFAULT_API_TOKENS = ['Read Only', 'Full Access'];
    const apiTokenNames = (await strapi.documents('admin::api-token').findMany()).map(
      (token) => token.name
    );
    const didCreateApiToken = apiTokenNames.some((name) => !DEFAULT_API_TOKENS.includes(name));

    // Compute an array of action names that have been completed
    const requiredActions = {
      didCreateContentTypeSchema,
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
