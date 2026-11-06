import { extendType, nonNull, idArg } from 'nexus';
import type * as Nexus from 'nexus';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';
import { createWriteGuard, isSubjectAware, statusArg, stringArg } from '../permissions';
import { respondToWrite } from '../nested-output';

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { args } = getService('internals');

  const {
    getCreateMutationTypeName,
    getUpdateMutationTypeName,
    getDeleteMutationTypeName,
    getContentTypeInputName,
    getTypeName,
  } = naming;

  const addCreateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const createMutationName = getCreateMutationTypeName(contentType);
    const typeName = getTypeName(contentType);

    t.field(createMutationName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        // Create payload
        status: args.PublicationStatusArg,
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context, info) {
        const { auth } = context.state;

        if (!isSubjectAware(strapi, context)) {
          // Sanitize input data
          const sanitizedInputData = await strapi.contentAPI.sanitize.input(
            args.data,
            contentType,
            {
              auth,
            }
          );

          return strapi.documents!(uid).create({
            ...args,
            data: sanitizedInputData,
          });
        }

        const guard = createWriteGuard(strapi, contentType);
        const locale = stringArg(args.locale);

        // An empty body would make an entry with no owner
        guard.assertCanCreate(auth);

        // A caller without `publish` writes a draft, whatever `status` asks for
        const resolved = await strapi.contentAPI.permissions.resolveWriteStatus(auth, uid, {
          requested: statusArg(args.status),
          locale,
        });

        // The relations the response selects are read in that status: judged before the write
        await guard.assertSelectionDrafts(auth, resolved.status, info);

        const options = { auth, action: 'create', ...(locale === undefined ? {} : { locale }) };

        await strapi.contentAPI.validate.input(args.data, contentType, options);
        const sanitizedInputData = await strapi.contentAPI.sanitize.input(
          args.data,
          contentType,
          options
        );

        const { data: _data, status: _status, locale: _locale, ...rest } = args;
        const params = {
          ...rest,
          ...(locale === undefined ? {} : { locale }),
          ...(resolved.status === undefined ? {} : { status: resolved.status }),
          data: sanitizedInputData,
        };

        // The data written must match the caller's `create` conditions, and a conditioned `publish`
        // can only be checked against the entry once it exists: both are judged in the transaction
        // that writes it, so a refusal leaves nothing behind
        const entity = await strapi.db.transaction(async () => {
          const written = await strapi.documents!(uid).create(params);

          await guard.assertWritten(auth, 'create', written, locale, resolved);

          return resolved.publishAfterCreate
            ? guard.publishCreated(auth, written, locale)
            : written;
        });

        return respondToWrite(strapi, contentType, 'create', entity, {
          status: resolved.status,
          locale,
          context,
          info,
        });
      },
    });
  };

  const addUpdateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const updateMutationName = getUpdateMutationTypeName(contentType);
    const typeName = getTypeName(contentType);

    t.field(updateMutationName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        documentId: nonNull(idArg()),
        status: args.PublicationStatusArg,
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context, info) {
        const { auth } = context.state;

        const { data, ...restParams } = args;

        if (!isSubjectAware(strapi, context)) {
          // Sanitize input data
          const sanitizedInputData = await strapi.contentAPI.sanitize.input(data, contentType, {
            auth,
          });

          return strapi.documents!(uid).update({
            ...restParams,
            data: sanitizedInputData,
          });
        }

        const { permissions } = strapi.contentAPI;
        const guard = createWriteGuard(strapi, contentType);
        const { documentId } = args;
        const locale = stringArg(args.locale);

        // An update of a locale the document has none in creates it: it is checked once written,
        // and is written as a create (a conditioned `publish` has no stored entry to match before)
        const adds = await guard.addsLocale(documentId, locale);

        if (adds) {
          guard.assertCanCreate(auth);
        }

        // A caller without `publish` writes a draft, whatever `status` asks for
        const resolved = await permissions.resolveWriteStatus(auth, uid, {
          requested: statusArg(args.status),
          ...(adds ? {} : { documentId }),
          locale,
        });

        // The Document Service's `update` ignores filters: the stored entry must be the caller's
        await permissions.assertEntry(auth, 'update', uid, documentId, { locale });

        // An update that publishes replaces the published version: it must be the caller's too. A
        // new locale has none to replace
        if (!adds && guard.publishes(resolved)) {
          await permissions.assertEntry(auth, 'publish', uid, documentId, { locale });
        }

        // The relations the response selects are read in that status: judged before the write
        await guard.assertSelectionDrafts(auth, resolved.status, info);

        const options = {
          auth,
          action: 'update',
          documentId,
          ...(locale === undefined ? {} : { locale }),
          ...(adds ? { creates: true } : {}),
        };

        await strapi.contentAPI.validate.input(data, contentType, options);
        const sanitizedInputData = await strapi.contentAPI.sanitize.input(
          data,
          contentType,
          options
        );

        const { status: _status, locale: _locale, ...rest } = restParams;
        const params = {
          ...rest,
          ...(locale === undefined ? {} : { locale }),
          ...(resolved.status === undefined ? {} : { status: resolved.status }),
          data: sanitizedInputData,
        };

        // The entry the update adds must be the caller's to write once it exists, as the others
        // are before; the data written must match the caller's conditions for the action (`create`
        // for an added locale); and a conditioned `publish` is decided on the draft as written. All
        // are judged in the transaction that writes it, so a mismatch leaves nothing behind
        const entity = await strapi.db.transaction(async () => {
          const written = await strapi.documents!(uid).update(params);

          if (adds) {
            await permissions.assertEntry(auth, 'update', uid, documentId, { locale });
          }

          await guard.assertWritten(auth, adds ? 'create' : 'update', written, locale, resolved);

          return resolved.publishAfterCreate
            ? guard.publishCreated(auth, written, locale)
            : written;
        });

        return respondToWrite(strapi, contentType, 'update', entity, {
          status: resolved.status,
          locale,
          context,
          info,
        });
      },
    });
  };

  const addDeleteMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const deleteMutationName = getDeleteMutationTypeName(contentType);

    const { DELETE_MUTATION_RESPONSE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

    t.field(deleteMutationName, {
      type: DELETE_MUTATION_RESPONSE_TYPE_NAME,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        documentId: nonNull(idArg()),
      },

      async resolve(parent, args, context) {
        const { documentId } = args;

        if (isSubjectAware(strapi, context)) {
          const locale = stringArg(args.locale);

          // The Document Service's `delete` ignores filters: every version it removes must be the
          // caller's, in the locale it removes (the one asked for, or the default locale)
          await strapi.contentAPI.permissions.assertEntry(
            context.state.auth,
            'delete',
            uid,
            documentId,
            { locale }
          );

          await strapi.documents!(uid).delete({
            documentId,
            ...(locale === undefined ? {} : { locale }),
          });

          return { documentId };
        }

        await strapi.documents!(uid).delete({ documentId });

        return { documentId };
      },
    });
  };

  return {
    buildCollectionTypeMutations(contentType: Struct.CollectionTypeSchema) {
      const createMutationName = `Mutation.${getCreateMutationTypeName(contentType)}`;
      const updateMutationName = `Mutation.${getUpdateMutationTypeName(contentType)}`;
      const deleteMutationName = `Mutation.${getDeleteMutationTypeName(contentType)}`;

      const extension = getService('extension');

      const registerAuthConfig = (action: string, auth: any) => {
        return extension.use({ resolversConfig: { [action]: { auth } } });
      };

      const isActionEnabled = (action: string) => {
        return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
      };

      const isCreateEnabled = isActionEnabled('create');
      const isUpdateEnabled = isActionEnabled('update');
      const isDeleteEnabled = isActionEnabled('delete');

      if (isCreateEnabled) {
        registerAuthConfig(createMutationName, { scope: [`${contentType.uid}.create`] });
      }

      if (isUpdateEnabled) {
        registerAuthConfig(updateMutationName, { scope: [`${contentType.uid}.update`] });
      }

      if (isDeleteEnabled) {
        registerAuthConfig(deleteMutationName, { scope: [`${contentType.uid}.delete`] });
      }

      return extendType({
        type: 'Mutation',

        definition(t) {
          if (isCreateEnabled) {
            addCreateMutation(t, contentType);
          }

          if (isUpdateEnabled) {
            addUpdateMutation(t, contentType);
          }

          if (isDeleteEnabled) {
            addDeleteMutation(t, contentType);
          }
        },
      });
    },
  };
};
