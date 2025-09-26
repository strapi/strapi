import type { yup } from '@strapi/utils';

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
  validator: (helpers: {
    textNodeValidator: ReturnType<typeof yup.object>;
    linkNodeValidator: ReturnType<typeof yup.object>;
    inlineNodeValidator: any;
    checkValidLink: (link: string) => boolean;
  }) => ReturnType<typeof yup.object>;
}

export interface CustomBlocks {
  register: (customBlocks: CustomBlockServerOptions[] | CustomBlockServerOptions) => void;
}
