import { extendType, nonNull, list } from 'nexus';
import type * as Nexus from 'nexus';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;
  const { toEntityResponseCollection } = getService('format').returnTypes;

  const {
    getFindOneQueryName,
    getTypeName,
    getFindQueryName,
    getFindConnectionQueryName,
    getEntityResponseCollectionName,
  } = naming;

  const buildCollectionTypeQueries = (contentType: Struct.CollectionTypeSchema) => {
    const findOneQueryName = `Query.${getFindOneQueryName(contentType)}`;
    const findQueryName = `Query.${getFindQueryName(contentType)}`;
    const findConnectionQueryName = `Query.${getFindConnectionQueryName(contentType)}`;

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
      registerAuthConfig(findConnectionQueryName, { scope: [`${contentType.uid}.find`] });
    }

    return extendType({
      type: 'Query',

      definition(t) {
        if (isFindOneEnabled) {
          addFindOneQuery(t, contentType);
        }

        if (isFindEnabled) {
          addFindConnectionQuery(t, contentType);
          addFindQuery(t, contentType);
        }
      },
    });
  };

  /**
   * Register a "find one" query field to the nexus type definition
   */
  const addFindOneQuery = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Query'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const findOneQueryName = getFindOneQueryName(contentType);
    const typeName = getTypeName(contentType);

    t.field(findOneQueryName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: getContentTypeArgs(contentType, { multiple: false }),

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType });

        const { findOne } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        // queryResolvers will sanitize params
        return findOne(parent, transformedArgs, ctx);
      },
    });
  };

  /**
   * Register a "find" query field to the nexus type definition
   */
  const addFindQuery = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Query'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const findQueryName = getFindQueryName(contentType);
    const typeName = getTypeName(contentType);

    t.field(findQueryName, {
      type: nonNull(list(typeName)),

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: getContentTypeArgs(contentType),

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { findMany } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        // queryResolvers will sanitize params
        return findMany(parent, transformedArgs, ctx);
      },
    });
  };

  /**
   * Register a "find" query field to the nexus type definition
   */
  const addFindConnectionQuery = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Query'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const queryName = getFindConnectionQueryName(contentType);
    const responseCollectionTypeName = getEntityResponseCollectionName(contentType);

    t.field(queryName, {
      type: responseCollectionTypeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: getContentTypeArgs(contentType),

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { findMany } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        // queryResolvers will sanitize params
        const nodes = await findMany(parent, transformedArgs, ctx);

        return toEntityResponseCollection(nodes, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return { buildCollectionTypeQueries };
};
