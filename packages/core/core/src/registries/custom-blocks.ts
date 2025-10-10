import { has } from 'lodash/fp';
import { yup } from '@strapi/utils';

import type { Core } from '@strapi/types';

export interface CustomBlockServerOptions {
  /**
   * The name of the custom block type
   */
  name: string;

  /**
   * The name of the plugin creating the custom block
   */
  plugin?: string;

  /**
   * Function that returns a Yup validation schema for the block.
   * Receives helper validators that can be reused for common node types.
   */
  validator: (helpers: { inlineNodeValidator: any }) => ReturnType<typeof yup.object>;
}

const customBlocksRegistry = (strapi: Core.Strapi) => {
  const customBlocks: Record<string, CustomBlockServerOptions> = {};

  return {
    getAll() {
      return customBlocks;
    },
    get(customBlock: string) {
      const registeredCustomBlock = customBlocks[customBlock];
      if (!registeredCustomBlock) {
        throw new Error(`Could not find Custom Block: ${customBlock}`);
      }

      return registeredCustomBlock;
    },
    add(customBlock: CustomBlockServerOptions | CustomBlockServerOptions[]) {
      const customBlockList = Array.isArray(customBlock) ? customBlock : [customBlock];

      for (const cb of customBlockList) {
        if (!has('name', cb) || !has('validator', cb)) {
          throw new Error(`Custom blocks require a 'name' and 'validator' key`);
        }

        const { name, plugin, validator } = cb;

        // Validate that the validator is a function
        if (!validator || typeof validator !== 'function') {
          throw new Error(`Custom block validator must be a function that returns a Yup schema`);
        }

        const isValidObjectKey = /^(?![0-9])[a-zA-Z0-9$_-]+$/g;
        if (!isValidObjectKey.test(name)) {
          throw new Error(`Custom block name: '${name}' is not a valid object key`);
        }

        // When no plugin is specified, or it isn't found in Strapi, default to global
        const uid =
          plugin && strapi.plugin(plugin) ? `plugin::${plugin}.${name}` : `global::${name}`;

        if (has(uid, customBlocks)) {
          throw new Error(`Custom block: '${uid}' has already been registered`);
        }

        customBlocks[uid] = cb;
      }
    },
  };
};

export default customBlocksRegistry;
