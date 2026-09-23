import _ from 'lodash';
import { getOr } from 'lodash/fp';
import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { UID, Struct } from '@strapi/types';
import { formatAttributes, replaceTemporaryUIDs } from '../utils/attributes';
import { getService } from '../utils';
import createBuilder from './schema-builder';
import { finalizeSchemaMutation, rollbackSchemaMutation } from './schema-mutation';
import { coreUids, pluginsUids } from './constants';

const { ApplicationError } = errors;

export const isCTBOwnedApplicationContentType = (uid: UID.ContentType): boolean =>
  uid.startsWith('api::');

export const assertCTBOwnedApplicationContentType = (uid: UID.ContentType): void => {
  if (!isCTBOwnedApplicationContentType(uid)) {
    throw new ApplicationError(`Content type "${uid}" is not managed by CTB and cannot be deleted`);
  }
};

const pruneFolderReferences = (uids: UID.ContentType[]) => {
  return getService('content-structure').commitFromUpdate({ deletedUids: new Set(uids) });
};

export const isContentTypeVisible = (model: Struct.ContentTypeSchema) =>
  getOr(true, 'pluginOptions.content-type-builder.visible', model) === true;

export const getRestrictRelationsTo = (contentType: Struct.ContentTypeSchema) => {
  const { uid } = contentType;
  if (uid === coreUids.STRAPI_USER) {
    // TODO: replace with an obj { relation: 'x', bidirectional: true|false }
    return ['oneWay', 'manyWay'];
  }

  if (
    uid.startsWith(coreUids.PREFIX) ||
    uid === pluginsUids.UPLOAD_FILE ||
    !isContentTypeVisible(contentType)
  ) {
    return [];
  }

  return null;
};

/**
 * Format a contentType info to be used by the front-end
 */
export const formatContentType = (contentType: any) => {
  const { uid, kind, modelName, plugin, collectionName, info } = contentType;

  return {
    uid,
    plugin,
    apiID: modelName,
    schema: {
      ...contentTypesUtils.getOptions(contentType),
      displayName: info.displayName,
      singularName: info.singularName,
      pluralName: info.pluralName,
      description: _.get(info, 'description', ''),
      pluginOptions: contentType.pluginOptions,
      kind: kind || 'collectionType',
      collectionName,
      attributes: formatAttributes(contentType),
      visible: isContentTypeVisible(contentType),
      restrictRelationsTo: getRestrictRelationsTo(contentType),
    },
  };
};

export const createContentTypes = async (contentTypes: any[]) => {
  const builder = createBuilder();
  const createdContentTypes: any[] = [];
  const generatedApiNames: string[] = [];
  let schemaAlreadyRolledBack = false;

  try {
    for (const contentType of contentTypes) {
      createdContentTypes.push(
        await createContentType(contentType, {
          defaultBuilder: builder,
          generatedApiNames,
          deferEvent: true,
        })
      );
    }

    const schemaFilesWritten = await builder.writeFiles();
    if (!schemaFilesWritten) {
      schemaAlreadyRolledBack = true;
      throw new ApplicationError('Invalid schema edition');
    }
  } catch (error) {
    const apiHandler = strapi
      .plugin('content-type-builder')
      .service('api-handler') as typeof import('./api-handler');
    await rollbackSchemaMutation({
      builder,
      apiHandler,
      generatedApiNames,
      schemaAlreadyRolledBack,
    });

    throw error;
  }

  for (const contentType of createdContentTypes) {
    strapi.eventHub.emit('content-type.create', { contentType });
  }

  return createdContentTypes;
};

type CreateContentTypeOptions = {
  defaultBuilder?: any; // TODO
  generatedApiNames?: string[];
  deferEvent?: boolean;
};

/**
 * Creates a content type and handle the nested components sent with it
 */
export const createContentType = async (
  { contentType, components }: any,
  options: CreateContentTypeOptions = {}
) => {
  const builder = options.defaultBuilder || createBuilder();
  const uidMap = builder.createNewComponentUIDMap(components || []);

  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const newContentType = builder.createContentType(replaceTmpUIDs(contentType));

  // allow components to target the new contentType
  const targetContentType = (infos: any) => {
    Object.keys(infos.attributes).forEach((key) => {
      const { target } = infos.attributes[key];
      if (target === '__contentType__') {
        infos.attributes[key].target = newContentType.uid;
      }
    });

    return infos;
  };

  components?.forEach((component: any) => {
    const options = replaceTmpUIDs(targetContentType(component));

    if (!_.has(component, 'uid')) {
      return builder.createComponent(options);
    }

    return builder.editComponent(options);
  });

  const generatedApiNames = options.generatedApiNames ?? [];
  let schemaAlreadyRolledBack = false;

  try {
    // Generate before writing the schema so a successful mutation retains the existing layout.
    if (!contentType.plugin) {
      generatedApiNames.push(contentType.singularName);

      await generateAPI({
        displayName: contentType!.displayName || contentType!.info.displayName,
        singularName: contentType!.singularName,
        pluralName: contentType!.pluralName,
        kind: contentType!.kind,
      });
    }

    if (!options.defaultBuilder) {
      const schemaFilesWritten = await builder.writeFiles();
      if (!schemaFilesWritten) {
        schemaAlreadyRolledBack = true;
        throw new ApplicationError('Invalid schema edition');
      }
    }
  } catch (error) {
    if (!options.defaultBuilder) {
      const apiHandler = strapi
        .plugin('content-type-builder')
        .service('api-handler') as typeof import('./api-handler');
      await rollbackSchemaMutation({
        builder,
        apiHandler,
        generatedApiNames,
        schemaAlreadyRolledBack,
      });
    }

    throw error;
  }

  if (!options.deferEvent) {
    strapi.eventHub.emit('content-type.create', { contentType: newContentType });
  }

  return newContentType;
};

/**
 * Generate an API skeleton
 */
export const generateAPI = ({
  singularName,
  kind = 'collectionType',
  pluralName,
  displayName,
}: any) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const strapiGenerators = require('@strapi/generators');
  return strapiGenerators.generate(
    'content-type',
    {
      kind,
      singularName,
      id: singularName,
      pluralName,
      displayName,
      destination: 'new',
      bootstrapApi: true,
      attributes: [],
    },
    { dir: strapi.dirs.app.root }
  );
};

/**
 * Edits a contentType and handle the nested contentTypes sent with it
 */
export const editContentType = async (
  uid: UID.ContentType,
  { contentType, components = [] }: any
) => {
  const builder = createBuilder();

  const previousSchema = builder.contentTypes.get(uid).schema;
  const isPluginContentType = Boolean(builder.contentTypes.get(uid).plugin);
  const previousKind = previousSchema.kind;
  const newKind = contentType.kind || previousKind;

  // Restore non-visible attributes from previous schema
  const previousAttributes = previousSchema.attributes;
  const prevNonVisibleAttributes = contentTypesUtils
    .getNonVisibleAttributes(previousSchema)
    .reduce((acc, key) => {
      if (key in previousAttributes) {
        acc[key] = previousAttributes[key];
      }

      return acc;
    }, {} as any);
  contentType.attributes = _.merge(prevNonVisibleAttributes, contentType.attributes);

  if (newKind !== previousKind && newKind === 'singleType') {
    const entryCount = await strapi.db.query(uid).count();
    if (entryCount > 1) {
      throw new ApplicationError(
        'You cannot convert a collectionType to a singleType when having multiple entries in DB'
      );
    }
  }

  const uidMap = builder.createNewComponentUIDMap(components);
  const replaceTmpUIDs = replaceTemporaryUIDs(uidMap);

  const updatedContentType = builder.editContentType({
    uid,
    ...replaceTmpUIDs(contentType),
  });

  components.forEach((component: any) => {
    if (!_.has(component, 'uid')) {
      return builder.createComponent(replaceTmpUIDs(component));
    }

    return builder.editComponent(replaceTmpUIDs(component));
  });

  if (newKind !== previousKind) {
    let schemaAlreadyRolledBack = false;
    const apiHandler = strapi
      .plugin('content-type-builder')
      .service('api-handler') as typeof import('./api-handler');
    await apiHandler.backup(uid);

    try {
      await apiHandler.clear(uid, { preserveBackup: true });

      if (!isPluginContentType) {
        // generate new api skeleton
        await generateAPI({
          displayName: updatedContentType.schema.info.displayName,
          singularName: updatedContentType.schema.info.singularName,
          pluralName: updatedContentType.schema.info.pluralName,
          kind: updatedContentType.schema.kind,
        });
      }

      const schemaFilesWritten = await builder.writeFiles();
      if (!schemaFilesWritten) {
        schemaAlreadyRolledBack = true;
        throw new ApplicationError('Invalid schema edition');
      }
      await pruneFolderReferences([uid]);
    } catch (error) {
      await rollbackSchemaMutation({
        builder,
        apiHandler,
        backedUpApiUids: [uid],
        schemaAlreadyRolledBack,
      });

      throw error;
    }

    for (const error of await finalizeSchemaMutation({ apiHandler, backedUpApiUids: [uid] })) {
      strapi.log.error(error);
    }

    return updatedContentType;
  }

  await builder.writeFiles();

  strapi.eventHub.emit('content-type.update', { contentType: updatedContentType });

  return updatedContentType;
};

export const deleteContentTypes = async (uids: UID.ContentType[]) => {
  uids.forEach(assertCTBOwnedApplicationContentType);

  const builder = createBuilder();
  const apiHandler = strapi
    .plugin('content-type-builder')
    .service('api-handler') as typeof import('./api-handler');

  const deletedContentTypes: any[] = [];
  const backedUpApiUids: UID.ContentType[] = [];
  let schemaAlreadyRolledBack = false;

  try {
    for (const uid of uids) {
      await apiHandler.backup(uid);
      backedUpApiUids.push(uid);
      deletedContentTypes.push(builder.deleteContentType(uid));
    }

    const schemaFilesWritten = await builder.writeFiles();
    if (!schemaFilesWritten) {
      schemaAlreadyRolledBack = true;
      throw new ApplicationError('Invalid schema edition');
    }

    for (const uid of uids) {
      await apiHandler.clear(uid, { preserveBackup: true });
    }

    await pruneFolderReferences(uids);
  } catch (error) {
    await rollbackSchemaMutation({
      builder,
      apiHandler,
      backedUpApiUids,
      schemaAlreadyRolledBack,
    });

    throw error;
  }

  for (const error of await finalizeSchemaMutation({ apiHandler, backedUpApiUids })) {
    strapi.log.error(error);
  }

  for (const contentType of deletedContentTypes) {
    strapi.eventHub.emit('content-type.delete', { contentType });
  }
};

/**
 * Deletes a content type and the api files related to it
 */
export const deleteContentType = async (uid: UID.ContentType, defaultBuilder: any = undefined) => {
  assertCTBOwnedApplicationContentType(uid);

  const builder = defaultBuilder || createBuilder();
  // make a backup
  const apiHandler = strapi
    .plugin('content-type-builder')
    .service('api-handler') as typeof import('./api-handler');
  await apiHandler.backup(uid);

  let contentType;
  let schemaAlreadyRolledBack = false;

  if (!defaultBuilder) {
    try {
      contentType = builder.deleteContentType(uid);
      const schemaFilesWritten = await builder.writeFiles();
      if (!schemaFilesWritten) {
        schemaAlreadyRolledBack = true;
        throw new ApplicationError('Invalid schema edition');
      }
      await apiHandler.clear(uid, { preserveBackup: true });
      await pruneFolderReferences([uid]);
    } catch (error) {
      await rollbackSchemaMutation({
        builder,
        apiHandler,
        backedUpApiUids: [uid],
        schemaAlreadyRolledBack,
      });

      throw error;
    }

    for (const error of await finalizeSchemaMutation({ apiHandler, backedUpApiUids: [uid] })) {
      strapi.log.error(error);
    }
  } else {
    contentType = builder.deleteContentType(uid);
  }

  if (!defaultBuilder) {
    strapi.eventHub.emit('content-type.delete', { contentType });
  }

  return contentType;
};
