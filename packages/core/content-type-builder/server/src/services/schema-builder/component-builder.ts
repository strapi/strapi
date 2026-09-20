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

const createAvailableIdentity = (infos: any, components: Map<string, any>) => {
  const category = strings.nameToSlug(infos.category);
  const name = strings.nameToSlug(infos.displayName);

  const duplicateDisplayName = Array.from(components.values()).some((component) => {
    const [componentCategory] = component.uid.split('.');

    return (
      componentCategory === category &&
      strings.nameToSlug(component.schema.info.displayName) === name
    );
  });

  if (duplicateDisplayName) {
    throw new ApplicationError('component.alreadyExists');
  }

  const baseCollectionName = createCollectionName(infos.category, infos.displayName);
  const usedCollectionNames = new Set(
    Array.from(components.values(), (component) => component.schema.collectionName)
  );

  let suffix = 0;

  while (true) {
    const identityName = suffix === 0 ? name : `${name}-${suffix}`;
    const uid = `${category}.${identityName}`;
    const collectionName =
      suffix === 0 ? baseCollectionName : `${baseCollectionName}_${suffix}`;

    if (!components.has(uid) && !usedCollectionNames.has(collectionName)) {
      return {
        uid,
        collectionName,
        filename: `${identityName}.json`,
      };
    }

    suffix += 1;
  }
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

      const { uid, collectionName, filename } = createAvailableIdentity(infos, this.components);

      const handler = createSchemaHandler({
        dir: path.join(strapi.dirs.app.components, strings.nameToSlug(infos.category)),
        filename,
      });

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

      const [, nameUID] = uid.split('.');

      const newCategory = strings.nameToSlug(infos.category);
      const newUID = `${newCategory}.${nameUID}`;

      if (newUID !== uid && this.components.has(newUID)) {
        throw new errors.ApplicationError('component.edit.alreadyExists');
      }

      const newDir = path.join(strapi.dirs.app.components, newCategory);

      const oldAttributes = component.schema.attributes;

      const newAttributes = _.omitBy(infos.attributes, (attr, key) => {
        return _.has(oldAttributes, key) && !isConfigurable(oldAttributes[key]);
      });

      component
        .setUID(newUID)
        .setDir(newDir)
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
