import { extendType } from 'nexus';
import type * as Nexus from 'nexus';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;

  const { getFindOneQueryName, getTypeName } = naming;

  const buildSingleTypeQueries = (contentType: Struct.SingleTypeSchema) => {
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

    return extendType({
      type: 'Query',

      definition(t) {
        if (isFindEnabled) {
          addFindQuery(t, contentType);
        }
      },
    });
  };

  const addFindQuery = (
    t: Nexus.blocks.ObjectDefinitionBlock<string>,
    contentType: Struct.SingleTypeSchema
  ) => {
    const findQueryName = getFindOneQueryName(contentType);
    const typeName = getTypeName(contentType);

    t.field(findQueryName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: getContentTypeArgs(contentType),

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType });

        const { findFirst } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        return findFirst(parent, transformedArgs, ctx);
      },
    });
  };

  return { buildSingleTypeQueries };
};
