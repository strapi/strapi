import path from 'path';
import type { Internal } from '@strapi/types';
import _ from 'lodash';
import pluralize from 'pluralize';

import { strings, errors } from '@strapi/utils';
import { isConfigurable } from '../../utils/attributes';
import createSchemaHandler from './schema-handler';

const { ApplicationError } = errors;

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

    /**
     * create a component in the tmpComponent map
     */
    createComponent(this: any, infos: any) {
      const uid = this.createComponentUID(infos);

      if (this.components.has(uid)) {
        throw new ApplicationError('component.alreadyExists');
      }

      const handler = createSchemaHandler({
        dir: path.join(strapi.dirs.app.components, strings.nameToSlug(infos.category)),
        filename: `${strings.nameToSlug(infos.displayName)}.json`,
      });

      // TODO: create a utility for this
      // Duplicate in admin/src/components/FormModal/forms/utils/createCollectionName.ts
      const collectionName = `components_${strings.nameToCollectionName(
        infos.category
      )}_${strings.nameToCollectionName(pluralize(infos.displayName))}`;

      this.components.forEach((compo: any) => {
        if (compo.schema.collectionName === collectionName) {
          throw new ApplicationError('component.alreadyExists');
        }
      });

      handler
        .setUID(uid)
        .set('collectionName', collectionName)
        .set(['info', 'displayName'], infos.displayName)
        .set(['info', 'icon'], infos.icon)
        .set(['info', 'description'], infos.description)
        .set('pluginOptions', infos.pluginOptions)
        .set('config', infos.config)
        .setAttributes(this.convertAttributes(infos.attributes));

      if (this.components.size === 0) {
        strapi.telemetry.send('didCreateFirstComponent');
      } else {
        strapi.telemetry.send('didCreateComponent');
      }

      this.components.set(uid, handler);

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
