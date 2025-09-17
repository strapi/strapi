/* eslint-disable check-file/filename-naming-convention */
import { ComponentType } from 'react';

import invariant from 'invariant';
import { Editor } from 'slate';
import { type RenderElementProps } from 'slate-react';

import type { Internal, Schema, Utils } from '@strapi/types';
import type { MessageDescriptor, PrimitiveType } from 'react-intl';
import type { CSSProperties } from 'styled-components';

type CustomBlockUID = Utils.String.Suffix<
  | Internal.Namespace.WithSeparator<Internal.Namespace.Plugin>
  | Internal.Namespace.WithSeparator<Internal.Namespace.Global>,
  string
>;

/**
 * Base interface for custom blocks
 */
interface BaseCustomBlock {
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  matchNode: (node: Schema.Attribute.BlocksNode) => boolean;
  handleConvert?: (editor: Editor) => void | (() => React.JSX.Element);
  handleEnterKey?: (editor: Editor) => void;
  handleBackspaceKey?: (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => void;
  handleTab?: (editor: Editor) => void;
  snippets?: string[];
  dragHandleTopMargin?: CSSProperties['marginTop'];
}

/**
 * Custom block that appears in the blocks selector dropdown
 */
interface SelectorCustomBlock extends BaseCustomBlock {
  isInBlocksSelector: true;
  icon: ComponentType;
  label: MessageDescriptor & {
    values?: Record<string, PrimitiveType>;
  };
}

/**
 * Custom block that doesn't appear in the blocks selector dropdown
 */
interface NonSelectorCustomBlock extends BaseCustomBlock {
  isInBlocksSelector: false;
}

/**
 * Configuration for registering a custom block
 */
interface CustomBlock {
  /**
   * Unique key for the block
   */
  key: string;
  /**
   * Plugin ID - if not provided, defaults to global namespace
   */
  pluginId?: string;
}

type CustomBlockConfig = CustomBlock & (SelectorCustomBlock | NonSelectorCustomBlock);

/**
 * Registry for managing custom blocks in the blocks editor
 *
 * @example
 * ```typescript
 * // In a plugin's admin/src/index.ts
 * export default {
 *   register(app) {
 *     app.getPlugin('content-manager').apis.addBlocks([
 *       {
 *         key: 'callout',
 *         renderElement: (props) => <CalloutBlock {...props} />,
 *         icon: AlertTriangle,
 *         label: { id: 'blocks.callout', defaultMessage: 'Callout' },
 *         matchNode: (node) => node.type === 'callout',
 *         isInBlocksSelector: true,
 *         handleConvert(editor) {
 *           // Block conversion logic
 *         },
 *         snippets: [':::callout']
 *       }
 *     ]);
 *   }
 * }
 * ```
 */
class BlocksRegistry {
  private customBlocks: Record<string, CustomBlockConfig>;

  constructor() {
    this.customBlocks = {};
  }

  /**
   * Register one or more custom blocks
   */
  register = (blocks: CustomBlockConfig | CustomBlockConfig[]) => {
    if (Array.isArray(blocks)) {
      // If several custom blocks are passed, register them one by one
      blocks.forEach((block) => {
        this.register(block);
      });
    } else {
      // Handle individual custom block
      const { key, pluginId, renderElement, matchNode, isInBlocksSelector } = blocks;

      // Ensure required attributes are provided
      invariant(key, 'A key must be provided');
      invariant(renderElement, 'A renderElement function must be provided');
      invariant(matchNode, 'A matchNode function must be provided');
      invariant(typeof isInBlocksSelector === 'boolean', 'isInBlocksSelector must be a boolean');

      // For selector blocks, ensure icon and label are provided
      if (isInBlocksSelector) {
        const selectorBlock = blocks as CustomBlock & SelectorCustomBlock;
        invariant(selectorBlock.icon, 'An icon must be provided for blocks in selector');
        invariant(selectorBlock.label, 'A label must be provided for blocks in selector');
      }

      // Ensure key has no special characters
      const isValidObjectKey = /^(?![0-9])[a-zA-Z0-9$_-]+$/g;
      invariant(isValidObjectKey.test(key), `Custom block key: '${key}' is not a valid object key`);

      // When no plugin is specified, default to the global namespace
      const uid: CustomBlockUID = pluginId ? `plugin::${pluginId}.${key}` : `global::${key}`;

      // Ensure the uid is unique
      const uidAlreadyUsed = Object.prototype.hasOwnProperty.call(this.customBlocks, uid);
      invariant(!uidAlreadyUsed, `Custom block: '${uid}' has already been registered`);

      this.customBlocks[uid] = blocks;
    }
  };

  /**
   * Get all registered custom blocks
   */
  getAll = () => {
    return this.customBlocks;
  };

  /**
   * Get a specific custom block by UID
   */
  get = (uid: string): CustomBlockConfig | undefined => {
    return this.customBlocks[uid];
  };

  /**
   * Get all registered blocks formatted for the BlocksEditor
   */
  getBlocksForEditor = () => {
    const blocks: Record<string, SelectorCustomBlock | NonSelectorCustomBlock> = {};

    Object.entries(this.customBlocks).forEach(([_uid, blockConfig]) => {
      // Use the block key (not the full UID) as the editor block key
      const blockKey = blockConfig.key;

      // Transform the block config to match BlocksEditor expectations
      const { key: _key, pluginId: _pluginId, ...editorBlock } = blockConfig;

      blocks[blockKey] = editorBlock;
    });

    return blocks;
  };
}

export { BlocksRegistry };
export type {
  CustomBlockConfig,
  CustomBlockUID,
  SelectorCustomBlock,
  NonSelectorCustomBlock,
  BaseCustomBlock,
};
