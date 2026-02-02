import _ from 'lodash';
import { getOr } from 'lodash/fp';
import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';
import type { UID, Struct } from '@strapi/types';
import { formatAttributes, replaceTemporaryUIDs } from '../utils/attributes';
import createBuilder from './schema-builder';
import { coreUids, pluginsUids } from './constants';

const { ApplicationError } = errors;

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

  for (const contentType of contentTypes) {
    createdContentTypes.push(await createContentType(contentType, { defaultBuilder: builder }));
  }

  await builder.writeFiles();

  return createdContentTypes;
};

type CreateContentTypeOptions = {
  defaultBuilder?: any; // TODO
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

  // generate api skeleton
  await generateAPI({
    displayName: contentType!.displayName || contentType!.info.displayName,
    singularName: contentType!.singularName,
    pluralName: contentType!.pluralName,
    kind: contentType!.kind,
  });

  if (!options.defaultBuilder) {
    await builder.writeFiles();
  }

  strapi.eventHub.emit('content-type.create', { contentType: newContentType });

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
    const apiHandler = strapi.plugin('content-type-builder').service('api-handler');
    await apiHandler.backup(uid);

    try {
      await apiHandler.clear(uid);

      // generate new api skeleton
      await generateAPI({
        displayName: updatedContentType.schema.info.displayName,
        singularName: updatedContentType.schema.info.singularName,
        pluralName: updatedContentType.schema.info.pluralName,
        kind: updatedContentType.schema.kind,
      });

      await builder.writeFiles();
    } catch (error) {
      strapi.log.error(error);
      await apiHandler.rollback(uid);
    }

    return updatedContentType;
  }

  await builder.writeFiles();

  strapi.eventHub.emit('content-type.update', { contentType: updatedContentType });

  return updatedContentType;
};

export const deleteContentTypes = async (uids: UID.ContentType[]) => {
  const builder = createBuilder();
  const apiHandler = strapi.plugin('content-type-builder').service('api-handler');

  for (const uid of uids) {
    await deleteContentType(uid, builder);
  }

  await builder.writeFiles();
  for (const uid of uids) {
    try {
      await apiHandler.clear(uid);
    } catch (error) {
      strapi.log.error(error);
      await apiHandler.rollback(uid);
    }
  }
};

/**
 * Deletes a content type and the api files related to it
 */
export const deleteContentType = async (uid: UID.ContentType, defaultBuilder: any = undefined) => {
  const builder = defaultBuilder || createBuilder();
  // make a backup
  const apiHandler = strapi.plugin('content-type-builder').service('api-handler');
  await apiHandler.backup(uid);

  const contentType = builder.deleteContentType(uid);

  if (!defaultBuilder) {
    try {
      await builder.writeFiles();
      await apiHandler.clear(uid);
    } catch (error) {
      await apiHandler.rollback(uid);
    }
  }

  strapi.eventHub.emit('content-type.delete', { contentType });

  return contentType;
};
