import path from 'path';
import type { Internal } from '@strapi/types';
import _ from 'lodash';
import pluralize from 'pluralize';

import { strings, errors } from '@strapi/utils';
import { isConfigurable } from '../../utils/attributes';
import createSchemaHandler from './schema-handler';

const { ApplicationError } = errors;

const createCollectionName = (category: string, displayName: string) =>
  `components_${strings.nameToCollectionName(category)}_${strings.nameToCollectionName(
    pluralize(displayName)
  )}`;

const createUniqueCollectionName = (baseName: string, components: Map<string, any>) => {
  const usedCollectionNames = new Set(
    Array.from(components.values(), (component) => component.schema.collectionName)
  );

  if (!usedCollectionNames.has(baseName)) {
    return baseName;
  }

  let suffix = 1;
  let candidate = `${baseName}_${suffix}`;

  while (usedCollectionNames.has(candidate)) {
    suffix += 1;
    candidate = `${baseName}_${suffix}`;
  }

  return candidate;
};

export default function createComponentBuilder() {
  return {
    createComponentUID({ category, displayName }: any) {
      return `${strings.nameToSlug(category)}.${strings.nameToSlug(displayName)}`;
    },

    createNewComponentUIDMap(components: object[]) {
      return components.reduce((uidMap: any, component: any) => {
        uidMap[component.tmpUID] = this.createComponentUID(component);
        return uidMap;
      }, {});
    },

    createComponentAttributes(this: any, uid: string, attributes: any) {
      if (!this.components.has(uid)) {
        throw new ApplicationError('component.notFound');
      }

      return this.components.get(uid).setAttributes(this.convertAttributes(attributes));
    },

    /**
     * create a component in the tmpComponent map
     */
    createComponent(this: any, infos: any) {
      if (infos.uid && infos.uid !== this.createComponentUID(infos)) {
        throw new ApplicationError('component.invalidUID');
      }

      const uid = infos.uid ?? this.createComponentUID(infos);

      if (this.components.has(uid)) {
        throw new ApplicationError('component.alreadyExists');
      }

      const handler = createSchemaHandler({
        dir: path.join(strapi.dirs.app.components, strings.nameToSlug(infos.category)),
        filename: `${strings.nameToSlug(infos.displayName)}.json`,
      });

      // Keep an existing component table stable when a component is renamed. If a newly-created
      // component would reuse that table name, give only the new table a deterministic suffix.
      const collectionName = createUniqueCollectionName(
        createCollectionName(infos.category, infos.displayName),
        this.components
      );

      handler
        .setUID(uid)
        .set('collectionName', collectionName)
        .set(['info', 'displayName'], infos.displayName)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('pluginOptions', infos.pluginOptions)
        .set('config', infos.config);

      if (this.components.size === 0) {
        strapi.telemetry.send('didCreateFirstComponent');
      } else {
        strapi.telemetry.send('didCreateComponent');
      }

      this.components.set(uid, handler);

      this.createComponentAttributes(uid, infos.attributes);

      return handler;
    },

    /**
     * create a component in the tmpComponent map
     */
    editComponent(this: any, infos: any) {
      const { uid } = infos;

      if (!this.components.has(uid)) {
        throw new errors.ApplicationError('component.notFound');
      }

      const component = this.components.get(uid);

      const newCategory = strings.nameToSlug(infos.category);
      const newName = strings.nameToSlug(infos.displayName);
      const newUID = `${newCategory}.${newName}`;

      if (newUID !== uid && this.components.has(newUID)) {
        throw new errors.ApplicationError('component.edit.alreadyExists');
      }

      const newDir = path.join(strapi.dirs.app.components, newCategory);
      const newFilename = `${newName}.json`;

      const oldAttributes = component.schema.attributes;

      const newAttributes = _.omitBy(infos.attributes, (attr, key) => {
        return _.has(oldAttributes, key) && !isConfigurable(oldAttributes[key]);
      });

      component
        .setUID(newUID)
        .setDir(newDir)
        .setFilename(newFilename)
        .set(['info', 'displayName'], infos.displayName)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('pluginOptions', infos.pluginOptions)
        .setAttributes(this.convertAttributes(newAttributes));

      if (newUID !== uid) {
        this.components.forEach((compo: any) => {
          compo.updateComponent(uid, newUID);
        });

        this.contentTypes.forEach((ct: any) => {
          ct.updateComponent(uid, newUID);
        });
      }

      return component;
    },

    deleteComponent(this: any, uid: Internal.UID.Component) {
      if (!this.components.has(uid)) {
        throw new errors.ApplicationError('component.notFound');
      }

      this.components.forEach((compo: any) => {
        compo.removeComponent(uid);
      });

      this.contentTypes.forEach((ct: any) => {
        ct.removeComponent(uid);
      });

      return this.components.get(uid).delete();
    },
  };
}
