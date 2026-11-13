import { extendType, nonNull } from 'nexus';
import { errors } from '@strapi/utils';
import type * as Nexus from 'nexus';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';
import { createWriteGuard, isSubjectAware, statusArg, stringArg } from '../permissions';
import { respondToWrite } from '../nested-output';

const { NotFoundError } = errors;

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { args } = getService('internals');

  const {
    getUpdateMutationTypeName,
    getTypeName,
    getContentTypeInputName,
    getDeleteMutationTypeName,
  } = naming;

  const addUpdateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.SingleTypeSchema
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
        // Update payload
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

          const document = await strapi.db?.query(uid).findOne();

          if (document) {
            return strapi.documents!(uid).update({
              ...args,
              documentId: document.documentId,
              data: sanitizedInputData,
            });
          }

          return strapi.documents!(uid).create({
            ...args,
            data: sanitizedInputData,
          });
        }

        const { permissions } = strapi.contentAPI;
        const guard = createWriteGuard(strapi, contentType);
        const locale = stringArg(args.locale);

        // The document the service writes, found as it finds it (any row of the type)
        const existing = await strapi.db?.query(uid).findOne({ select: ['documentId'] });
        const documentId: string | undefined = existing?.documentId || undefined;

        // With none yet, the first update creates the document: it is a create, for the owner and
        // the rows that say who may
        const creates = documentId === undefined;

        if (creates) {
          guard.assertCanCreate(auth);
        }

        // A locale the document has none in is created by the update as well
        const adds = documentId !== undefined && (await guard.addsLocale(documentId, locale));

        if (adds) {
          guard.assertCanCreate(auth);
        }

        // A caller without `publish` writes a draft, whatever `status` asks for
        const resolved = await permissions.resolveWriteStatus(auth, uid, {
          requested: statusArg(args.status),
          ...(documentId === undefined || adds ? {} : { documentId }),
          locale,
        });

        if (documentId !== undefined) {
          await permissions.assertEntry(auth, 'update', uid, documentId, { locale });

          // An update that publishes replaces the published version: it must be the caller's too.
          // A new locale has none to replace
          if (!adds && guard.publishes(resolved)) {
            await permissions.assertEntry(auth, 'publish', uid, documentId, { locale });
          }
        }

        // The relations the response selects are read in that status: judged before the write
        await guard.assertSelectionDrafts(auth, resolved.status, info);

        const options = {
          auth,
          action: 'update',
          ...(documentId === undefined ? {} : { documentId }),
          ...(locale === undefined ? {} : { locale }),
          ...(creates || adds ? { creates: true } : {}),
        };

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

        // The data written must match the caller's conditions for the action (`create` for a first
        // document or an added locale); the entry the update adds must be the caller's to write
        // once it exists; and a conditioned `publish` is decided on the draft as written. All are
        // judged in the transaction that writes it, so a mismatch leaves nothing behind
        const entity = await strapi.db.transaction(async () => {
          const written =
            documentId === undefined
              ? await strapi.documents!(uid).create(params)
              : await strapi.documents!(uid).update({ ...params, documentId });

          if (adds && documentId !== undefined) {
            await permissions.assertEntry(auth, 'update', uid, documentId, { locale });
          }

          await guard.assertWritten(
            auth,
            creates || adds ? 'create' : 'update',
            written,
            locale,
            resolved
          );

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
    contentType: Struct.SingleTypeSchema
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

      args: {},

      async resolve(parent, args, context) {
        const document = await strapi.db?.query(uid).findOne();

        if (!document) {
          throw new NotFoundError('Document not found');
        }

        if (isSubjectAware(strapi, context)) {
          const locale = stringArg(args.locale);

          // The Document Service's `delete` ignores filters: every version it removes must be the
          // caller's, in the locale it removes (the one asked for, or the default locale). Not
          // theirs is a 404, as a missing document is
          await strapi.contentAPI.permissions.assertEntry(
            context.state.auth,
            'delete',
            uid,
            document.documentId,
            { locale }
          );

          await strapi.documents!(uid).delete({
            documentId: document.documentId,
            ...(locale === undefined ? {} : { locale }),
          });

          return document;
        }

        await strapi.documents!(uid).delete({ ...args, documentId: document.documentId });

        return document;
      },
    });
  };

  return {
    buildSingleTypeMutations(contentType: Struct.SingleTypeSchema) {
      const updateMutationName = `Mutation.${getUpdateMutationTypeName(contentType)}`;
      const deleteMutationName = `Mutation.${getDeleteMutationTypeName(contentType)}`;

      const extension = getService('extension');

      const registerAuthConfig = (action: string, auth: any) => {
        return extension.use({ resolversConfig: { [action]: { auth } } });
      };

      const isActionEnabled = (action: string) => {
        return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
      };

      const isUpdateEnabled = isActionEnabled('update');
      const isDeleteEnabled = isActionEnabled('delete');

      if (isUpdateEnabled) {
        registerAuthConfig(updateMutationName, { scope: [`${contentType.uid}.update`] });
      }

      if (isDeleteEnabled) {
        registerAuthConfig(deleteMutationName, { scope: [`${contentType.uid}.delete`] });
      }

      return extendType({
        type: 'Mutation',

        definition(t) {
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
