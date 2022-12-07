import { ContentType } from '../../../types/schema';
import { StrapiCTX } from '../../../types/strapi-ctx';
import { builder } from '../pothosBuilder';

export default ({ strapi }: StrapiCTX) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;
  const { toEntityResponse, toEntityResponseCollection } = getService('format').returnTypes;

  const {
    getFindOneQueryName,
    getEntityResponseName,
    getFindQueryName,
    getEntityResponseCollectionName,
  } = naming;

  const buildCollectionTypeQueries = (contentType: ContentType) => {
    const findOneQueryName = `Query.${getFindOneQueryName(contentType)}`;
    const findQueryName = `Query.${getFindQueryName(contentType)}`;

    const extension = getService('extension');

    const registerAuthConfig = (action: string, auth: any) => {
      return extension.use({ resolversConfig: { [action]: { auth } } });
    };

    const isActionEnabled = (action: string) => {
      return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
    };

    const isFindOneEnabled = isActionEnabled('findOne');
    const isFindEnabled = isActionEnabled('find');

    if (isFindOneEnabled) {
      registerAuthConfig(findOneQueryName, { scope: [`${contentType.uid}.findOne`] });
    }

    if (isFindEnabled) {
      registerAuthConfig(findQueryName, { scope: [`${contentType.uid}.find`] });
    }

    return builder.queryFields((t) => {
      const fieldsObj: any = {};

      if (isFindOneEnabled) {
        fieldsObj[getFindOneQueryName(contentType)] = addFindOneQuery(t, contentType);
      }

      if (isFindEnabled) {
        fieldsObj[getFindQueryName(contentType)] = addFindQuery(t, contentType);
      }

      return fieldsObj;
    });
  };

  /**
   * Register a "find one" query field to the nexus type definition
   */
  const addFindOneQuery = (t: any, contentType: ContentType) => {
    const { uid } = contentType;

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: getContentTypeArgs(contentType, t, { multiple: false }),

      async resolve(parent: any, args: any) {
        const transformedArgs = transformArgs(args, { contentType });

        const { findOne } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = findOne(parent, transformedArgs);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  /**
   * Register a "find" query field to the nexus type definition
   */
  const addFindQuery = (t: any, contentType: any) => {
    const { uid } = contentType;

    const responseCollectionTypeName = getEntityResponseCollectionName(contentType);

    return t.field({
      type: responseCollectionTypeName,

      args: getContentTypeArgs(contentType, t),

      async resolve(parent: any, args: any) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { find } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const nodes = await find(parent, transformedArgs);

        return toEntityResponseCollection(nodes, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return { buildCollectionTypeQueries };
};
