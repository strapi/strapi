import { ContentType } from '../../../types/schema';
import { StrapiCTX } from '../../../types/strapi-ctx';
import { builder } from '../pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;
  const { toEntityResponse } = getService('format').returnTypes;

  const { getFindOneQueryName, getEntityResponseName } = naming;

  const buildSingleTypeQueries = (contentType: ContentType) => {
    const findQueryName = `Query.${getFindOneQueryName(contentType)}`;

    const extension = getService('extension');

    const registerAuthConfig = (action: string, auth: any) => {
      return extension.use({ resolversConfig: { [action]: { auth } } });
    };

    const isActionEnabled = (action: string) => {
      return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
    };

    const isFindEnabled = isActionEnabled('find');

    if (isFindEnabled) {
      registerAuthConfig(findQueryName, { scope: [`${contentType.uid}.find`] });
    }

    if (isFindEnabled) {
      return builder.queryField(getFindOneQueryName(contentType), (t) =>
        addFindQuery(t, contentType)
      );
    }
  };

  const addFindQuery = (t: any, contentType: ContentType) => {
    const { uid } = contentType;

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: getContentTypeArgs(contentType, t),

      async resolve(parent: any, args: any) {
        const transformedArgs = transformArgs(args, { contentType });

        const queriesResolvers = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = queriesResolvers.find(parent, transformedArgs);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return { buildSingleTypeQueries };
};
