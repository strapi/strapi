import _ from 'lodash';
import type { Attribute, Common, Schema } from '@strapi/types';

export type UploadFile = (
  uid: Common.UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

/**
 * Upload files and link them to an entity
 */
const uploadFile: UploadFile = async (uid, entity, files) => {
  const modelDef = strapi.getModel(uid);

  if (!_.has(strapi.plugins, 'upload')) {
    return;
  }

  const uploadService = strapi.plugin('upload').service('upload');

  const findModelFromUploadPath = (path: string[]) => {
    if (path.length === 0) {
      return uid;
    }

    const currentPath = [];
    let tmpModel: Schema.ContentType | Schema.Component = modelDef;
    let modelUID = uid;

    for (let i = 0; i < path.length; i += 1) {
      if (!tmpModel) {
        return {};
      }

      const part = path[i];
      const attr: Attribute.Any = tmpModel.attributes[part];

      currentPath.push(part);

      // ignore array indexes => handled in the dynamic zone section
      if (_.isFinite(_.toNumber(path[i]))) {
        continue;
      }

      if (!attr) return {};

      if (attr.type === 'component') {
        modelUID = attr.component;
        tmpModel = strapi.components[attr.component];
      } else if (attr.type === 'dynamiczone') {
        const entryIdx = path[i + 1]; // get component index
        const value = _.get(entity, [...currentPath, entryIdx]);

        if (!value) return {};

        modelUID = value.__component; // get component type
        tmpModel = strapi.components[modelUID as Common.UID.Component];
      } else if (attr.type === 'relation') {
        if (!('target' in attr)) {
          return {};
        }

        modelUID = attr.target;
        tmpModel = strapi.getModel(modelUID);
      } else {
        return;
      }
    }

    return modelUID;
  };

  const doUpload = async (key: string, files: unknown) => {
    const parts = key.split('.');
    const [path, field] = [_.initial(parts), _.last(parts)];

    const modelUID = findModelFromUploadPath(path);

    if (modelUID) {
      const id = _.get(entity, path.concat('id'));
      return uploadService.uploadToEntity({ id, model: modelUID, field }, files);
    }
  };

  await Promise.all(Object.keys(files).map((key) => doUpload(key, files[key])));
};

export default uploadFile;
