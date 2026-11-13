import { join } from 'path';
import _ from 'lodash';
import type { Internal } from '@strapi/types';

import { errors } from '@strapi/utils';
import createSchemaHandler, { type SchemaHandler } from './schema-handler';
import createComponentBuilder from './component-builder';
import createContentTypeBuilder from './content-type-builder';
import { renameComponentUIDs, type RenameComponentUIDsOptions } from './rename-component-uids';

/**
 * Creates a content type schema builder instance
 */
export default function createBuilder() {
  const components = Object.values(strapi.components).map((componentInput) => ({
    category: componentInput.category,
    modelName: componentInput.modelName,
    uid: componentInput.uid,
    filename: componentInput.__filename__,
    dir: join(strapi.dirs.app.components, componentInput.category),
    // The loader adds `__filename__` to the loaded schema; it is not part of the file, and a
    // rollback writes this schema back to the file
    schema: _.omit(componentInput.__schema__, '__filename__'),
    config: componentInput.config,
  }));

  const contentTypes = Object.values<any>(strapi.contentTypes).map((contentTypeInput) => {
    const dir = contentTypeInput.plugin
      ? join(
          strapi.dirs.app.extensions,
          contentTypeInput.plugin,
          'content-types',
          contentTypeInput.info.singularName
        )
      : join(
          strapi.dirs.app.api,
          contentTypeInput.apiName,
          'content-types',
          contentTypeInput.info.singularName
        );

    return {
      modelName: contentTypeInput.modelName,
      plugin: contentTypeInput.plugin,
      uid: contentTypeInput.uid,
      filename: 'schema.json',
      dir,
      schema: contentTypeInput.__schema__,
      config: contentTypeInput.config,
    };
  });

  return createSchemaBuilder({
    components,
    contentTypes,
  });
}

type SchemaBuilderOptions = {
  components: any;
  contentTypes: any;
};

function createSchemaBuilder({ components, contentTypes }: SchemaBuilderOptions) {
  const tmpComponents = new Map<Internal.UID.Component, SchemaHandler<Internal.UID.Component>>();
  const tmpContentTypes = new Map();

  // init temporary ContentTypes
  Object.keys(contentTypes).forEach((key) => {
    tmpContentTypes.set(contentTypes[key].uid, createSchemaHandler(contentTypes[key]));
  });

  // init temporary components
  Object.keys(components).forEach((key) => {
    tmpComponents.set(
      components[key].uid,
      createSchemaHandler<Internal.UID.Component>(components[key])
    );
  });

  return {
    get components() {
      return tmpComponents;
    },
    get contentTypes() {
      return tmpContentTypes;
    },

    /**
     * Convert Attributes received from the API to the right syntax
     */
    convertAttributes(attributes: any) {
      return Object.keys(attributes).reduce(
        (acc, key) => {
          acc[key] = this.convertAttribute(attributes[key]);
          return acc;
        },
        {} as Record<string, unknown>
      );
    },

    convertAttribute(attribute: any) {
      const { configurable, private: isPrivate, conditions } = attribute;

      const baseProperties = {
        private: isPrivate === true ? true : undefined,
        configurable: configurable === false ? false : undefined,
        // IMPORTANT: Preserve conditions only if they exist and are not undefined/null
        ...(conditions !== undefined && conditions !== null && { conditions }),
      };

      if (attribute.type === 'relation') {
        const { target, relation, targetAttribute, dominant, ...restOfProperties } = attribute;

        const attr = {
          type: 'relation',
          relation,
          target,
          ...restOfProperties,
          ...baseProperties,
        };

        // TODO: uncomment this when we pre-create empty types and targets exists if we create multiple types at once
        // if (target && !this.contentTypes.has(target)) {
        //   throw new errors.ApplicationError(`target: ${target} does not exist`);
        // }

        if (_.isNil(targetAttribute)) {
          return attr;
        }

        if (['oneToOne', 'manyToMany'].includes(relation) && dominant === true) {
          attr.inversedBy = targetAttribute;
        } else if (['oneToOne', 'manyToMany'].includes(relation) && dominant === false) {
          attr.mappedBy = targetAttribute;
        } else if (['oneToOne', 'manyToOne', 'manyToMany'].includes(relation)) {
          attr.inversedBy = targetAttribute;
        } else if (['oneToMany'].includes(relation)) {
          attr.mappedBy = targetAttribute;
        }

        return attr;
      }

      return {
        ...attribute,
        ...baseProperties,
      };
    },

    ...createComponentBuilder(),
    ...createContentTypeBuilder(),

    /**
     * Write all type to files, then rewrite the database rows that store a renamed
     * component uid (see `renameComponentRows`).
     *
     * Pass `{ renameComponentRows: false }` to only write the files. The caller must then
     * call `renameComponentRows` itself, before the reload, and roll the files back if it
     * throws. Do that when a later step must succeed together with the rows: run that
     * step through `renameComponentRows({ beforeCommit })`, so that its failure rolls the
     * rows back too.
     *
     * @returns boolean true if all files have been written correctly, false if an error
     * occurred while writing them (the files are rolled back)
     * @throws ApplicationError if the row rewrite failed (the files are rolled back) or if
     * a rollback failed
     */
    async writeFiles({ renameComponentRows = true }: { renameComponentRows?: boolean } = {}) {
      const schemas = [
        ...Array.from(tmpComponents.values()),
        ...Array.from(tmpContentTypes.values()),
      ];

      // Wait for every write to settle before rolling back, or a write still running would
      // land after the rollback (e.g. leave a created file on disk)
      const results = await Promise.allSettled(schemas.map((schema) => schema.flush()));
      const failure = results.find(
        (result): result is PromiseRejectedResult => result.status === 'rejected'
      );

      if (failure !== undefined) {
        strapi.log.error('Error writing schema files');
        strapi.log.error(failure.reason);

        try {
          await this.rollback();
        } catch (error) {
          strapi.log.error(
            'Error rolling back schema files. You might need to fix your files manually'
          );
          strapi.log.error(error);

          throw new errors.ApplicationError('Invalid schema edition');
        }

        return false;
      }

      if (renameComponentRows === false) {
        return true;
      }

      try {
        await this.renameComponentRows();
      } catch (error) {
        // The transaction already restored the rows. Restore the files too, or the next
        // reload would load the new uids against rows still holding the old ones.
        strapi.log.error('Error rewriting the rows of the renamed components');
        strapi.log.error(error);

        try {
          await this.rollback();
        } catch (rollbackError) {
          strapi.log.error(
            'Error rolling back schema files. You might need to fix your files manually'
          );
          strapi.log.error(rollbackError);
        }

        throw new errors.ApplicationError('Invalid schema edition');
      }

      return true;
    },

    /**
     * A component uid change (category move or rename) is also stored in the database:
     * as `component_type` in the `*_cmps` join tables and as the type column of the
     * polymorphic join tables (e.g. media in `files_related_mph`). Rewrites those rows in
     * one transaction. Must run while the running process still holds the pre-rename
     * metadata that locates them, i.e. before the reload.
     *
     * `beforeCommit` runs inside that transaction, after the rewrite and before the
     * commit (also when no uid changed). If it rejects, the rows are rolled back. It must
     * not use the database (see `renameComponentUIDs`).
     *
     * @throws if the rewrite or `beforeCommit` failed; the transaction has then restored
     * the rows
     */
    async renameComponentRows({ beforeCommit }: RenameComponentUIDsOptions = {}) {
      const componentUIDRenames = Array.from(tmpComponents.values())
        .filter((component) => component.initialUID && component.uid !== component.initialUID)
        .map((component) => ({ oldUID: component.initialUID, newUID: component.uid }));

      await renameComponentUIDs(strapi.db, componentUIDRenames, { beforeCommit });
    },

    /**
     * rollback all files
     */
    rollback() {
      return Promise.all(
        [...Array.from(tmpComponents.values()), ...Array.from(tmpContentTypes.values())].map(
          (schema) => schema.rollback()
        )
      );
    },
  };
}
