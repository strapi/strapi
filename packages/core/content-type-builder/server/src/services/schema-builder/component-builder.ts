import path from 'path';
import type { Internal } from '@strapi/types';
import _ from 'lodash';
import pluralize from 'pluralize';

import { strings, errors } from '@strapi/utils';
import { isConfigurable } from '../../utils/attributes';
import createSchemaHandler from './schema-handler';

const { ApplicationError } = errors;

// TODO: create a utility for this
// Duplicate in admin/src/components/FormModal/forms/utils/createCollectionName.ts
export const getComponentCollectionName = (category: string, displayName: string): string =>
  `components_${strings.nameToCollectionName(category)}_${strings.nameToCollectionName(
    pluralize(displayName)
  )}`;

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

      const collectionName = getComponentCollectionName(infos.category, infos.displayName);

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

      // The name half of the uid (and the schema file name) follows the display
      // name, but only when the display name actually changed: a component whose
      // file does not match its display name (e.g. a hand-edited schema) must
      // not be moved by an unrelated edit. This keeps the old name free once a
      // component has been renamed (CG-1001).
      //
      // Opt-in (`followDisplayName`): only the `update-schema` path sets it, as
      // it also generates the migration that renames the component's data table
      // and rewrites `component_type` references. The legacy
      // `PUT /components/:uid` route has no migration support and keeps the uid.
      const currentDisplayName = component.schema.info?.displayName;
      const displayNameChanged =
        infos.followDisplayName === true &&
        typeof infos.displayName === 'string' &&
        infos.displayName !== '' &&
        infos.displayName !== currentDisplayName;
      const newNameUID = displayNameChanged ? strings.nameToSlug(infos.displayName) : nameUID;

      const newUID = `${newCategory}.${newNameUID}`;

      if (newUID !== uid && this.components.has(newUID)) {
        throw new errors.ApplicationError('component.edit.alreadyExists');
      }

      const newDir = path.join(strapi.dirs.app.components, newCategory);
      const newFilename = `${newNameUID}.json`;

      // A renamed component also gets the collection name a component created
      // with that name would get, so the old name is really free afterwards
      // (`createComponent` rejects duplicate collection names). The data table
      // is renamed by the generated migration (see `collectComponentRenames` in
      // the schema service). A category-only move keeps its collection name.
      const newCollectionName = displayNameChanged
        ? getComponentCollectionName(newCategory, infos.displayName)
        : component.schema.collectionName;

      if (newCollectionName !== component.schema.collectionName) {
        this.components.forEach((compo: any) => {
          if (compo.schema.collectionName === newCollectionName) {
            throw new ApplicationError('component.edit.alreadyExists');
          }
        });
      }

      const oldAttributes = component.schema.attributes;

      const newAttributes = _.omitBy(infos.attributes, (attr, key) => {
        return _.has(oldAttributes, key) && !isConfigurable(oldAttributes[key]);
      });

      component
        .setUID(newUID)
        .setDir(newDir)
        .setFilename(newFilename)
        .set('collectionName', newCollectionName)
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
