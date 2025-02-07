import * as React from 'react';

import * as Toolbar from '@radix-ui/react-toolbar';
import { useElementOnScreen } from '@strapi/admin/strapi-admin';
import {
  Flex,
  Tooltip,
  SingleSelect,
  SingleSelectOption,
  Box,
  FlexComponent,
  BoxComponent,
  Menu,
  IconButton,
} from '@strapi/design-system';
import { Link, More } from '@strapi/icons';
import { MessageDescriptor, useIntl } from 'react-intl';
import { Editor, Transforms, Element as SlateElement, Node, type Ancestor } from 'slate';
import { ReactEditor } from 'slate-react';
import { css, styled } from 'styled-components';

import { EditorToolbarObserver } from '../../EditorToolbarObserver';

import {
  type BlocksStore,
  type SelectorBlockKey,
  isSelectorBlockKey,
  useBlocksEditorContext,
} from './BlocksEditor';
import { insertLink } from './utils/links';
import { type Block, getEntries, getKeys } from './utils/types';

const ToolbarWrapper = styled<FlexComponent>(Flex)`
  &[aria-disabled='true'] {
    cursor: not-allowed;
    background: ${({ theme }) => theme.colors.neutral150};
  }
`;

const ToolbarSeparator = styled(Toolbar.Separator)`
  background: ${({ theme }) => theme.colors.neutral150};
  width: 1px;
  height: 2.4rem;
`;

const FlexButton = styled<FlexComponent<'button'>>(Flex)`
  // Inherit the not-allowed cursor from ToolbarWrapper when disabled
  &[aria-disabled] {
    cursor: not-allowed;
  }

  &[aria-disabled='false'] {
    cursor: pointer;

    // Only apply hover styles if the button is enabled
    &:hover {
      background: ${({ theme }) => theme.colors.primary100};
    }
  }
`;

const SelectWrapper = styled<BoxComponent>(Box)`
  // Styling changes to SingleSelect component don't work, so adding wrapper to target SingleSelect
  div[role='combobox'] {
    border: none;
    cursor: pointer;
    min-height: unset;
    padding-top: 6px;
    padding-bottom: 6px;

    &[aria-disabled='false']:hover {
      cursor: pointer;
      background: ${({ theme }) => theme.colors.primary100};
    }

    &[aria-disabled] {
      background: transparent;
      cursor: inherit;

      // Select text and icons should also have disabled color
      span {
        color: ${({ theme }) => theme.colors.neutral600};
      }
    }
  }
`;

/**
 * Handles the modal component that may be returned by a block when converting it
 */
function useConversionModal() {
  const [modalElement, setModalComponent] = React.useState<React.JSX.Element | null>(null);

  const handleConversionResult = (renderModal: void | (() => React.JSX.Element) | undefined) => {
    // Not all blocks return a modal
    if (renderModal) {
      // Use cloneElement to apply a key because to create a new instance of the component
      // Without the new key, the state is kept from previous times that option was picked
      setModalComponent(React.cloneElement(renderModal(), { key: Date.now() }));
    }
  };

  return { modalElement, handleConversionResult };
}

interface ToolbarButtonProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  name: string;
  label: MessageDescriptor;
  isActive: boolean;
  disabled: boolean;
  handleClick: () => void;
}

const ToolbarButton = ({
  icon: Icon,
  name,
  label,
  isActive,
  disabled,
  handleClick,
}: ToolbarButtonProps) => {
  const { editor } = useBlocksEditorContext('ToolbarButton');
  const { formatMessage } = useIntl();
  const labelMessage = formatMessage(label);

  const enabledColor = isActive ? 'primary600' : 'neutral600';

  return (
    <Tooltip label={labelMessage}>
      <Toolbar.ToggleItem
        value={name}
        data-state={isActive ? 'on' : 'off'}
        onMouseDown={(e) => {
          e.preventDefault();
          handleClick();
          ReactEditor.focus(editor);
        }}
        aria-disabled={disabled}
        disabled={disabled}
        aria-label={labelMessage}
        asChild
      >
        <FlexButton
          tag="button"
          background={isActive ? 'primary100' : ''}
          alignItems="center"
          justifyContent="center"
          width={7}
          height={7}
          hasRadius
        >
          <Icon fill={disabled ? 'neutral300' : enabledColor} />
        </FlexButton>
      </Toolbar.ToggleItem>
    </Tooltip>
  );
};

const BlocksDropdown = () => {
  const { editor, blocks, disabled } = useBlocksEditorContext('BlocksDropdown');
  const { formatMessage } = useIntl();
  const { modalElement, handleConversionResult } = useConversionModal();

  const blockKeysToInclude: SelectorBlockKey[] = getEntries(blocks).reduce<
    ReturnType<typeof getEntries>
  >((currentKeys, entry) => {
    const [key, block] = entry;

    return block.isInBlocksSelector ? [...currentKeys, key] : currentKeys;
  }, []);

  const [blockSelected, setBlockSelected] = React.useState<SelectorBlockKey>('paragraph');

  const handleSelect = (optionKey: unknown) => {
    if (!isSelectorBlockKey(optionKey)) {
      return;
    }

    const editorIsEmpty =
      editor.children.length === 1 && Editor.isEmpty(editor, editor.children[0]);

    if (!editor.selection && !editorIsEmpty) {
      // When there is no selection, create an empty block at the end of the editor
      // so that it can be converted to the selected block
      Transforms.insertNodes(
        editor,
        {
          type: 'quote',
          children: [{ type: 'text', text: '' }],
        },
        {
          select: true,
          // Since there's no selection, Slate will automatically insert the node at the end
        }
      );
    } else if (!editor.selection && editorIsEmpty) {
      // When there is no selection and the editor is empty,
      // select the empty paragraph from Slate's initialValue so it gets converted
      Transforms.select(editor, Editor.start(editor, [0, 0]));
    }

    // If selection is already a list block, toggle its format
    const currentListEntry = Editor.above(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
    });

    if (currentListEntry && ['list-ordered', 'list-unordered'].includes(optionKey)) {
      const [currentList, currentListPath] = currentListEntry;
      const format = optionKey === 'list-ordered' ? 'ordered' : 'unordered';

      if (!Editor.isEditor(currentList) && isListNode(currentList)) {
        // Format is different, toggle list format
        if (currentList.format !== format) {
          Transforms.setNodes(editor, { format }, { at: currentListPath });
        }
      }
      return;
    }

    // Let the block handle the Slate conversion logic
    const maybeRenderModal = blocks[optionKey].handleConvert?.(editor);
    handleConversionResult(maybeRenderModal);

    setBlockSelected(optionKey);

    ReactEditor.focus(editor);
  };

  /**
   * Prevent the select from focusing itself so ReactEditor.focus(editor) can focus the editor instead.
   *
   * The editor first loses focus to a blur event when clicking the select button. However,
   * refocusing the editor is not enough since the select's default behavior is to refocus itself
   * after an option is selected.
   *
   */
  const preventSelectFocus = (e: Event) => e.preventDefault();

  // Listen to the selection change and update the selected block in the dropdown
  React.useEffect(() => {
    if (editor.selection) {
      let selectedNode: Ancestor;

      // If selection anchor is a list-item, get its parent
      const currentListEntry = Editor.above(editor, {
        match: (node) => !Editor.isEditor(node) && node.type === 'list',
        at: editor.selection.anchor,
      });

      if (currentListEntry) {
        const [currentList] = currentListEntry;
        selectedNode = currentList;
      } else {
        // Get the parent node of the anchor other than list-item
        const [anchorNode] = Editor.parent(editor, editor.selection.anchor, {
          edge: 'start',
          depth: 2,
        });

        // @ts-expect-error slate's delete behaviour creates an exceptional type
        if (anchorNode.type === 'list-item') {
          // When the last node in the selection is a list item,
          // slate's default delete operation leaves an empty list-item instead of converting it into a paragraph.
          // Issue: https://github.com/ianstormtaylor/slate/issues/2500

          Transforms.setNodes(editor, { type: 'paragraph' });
          // @ts-expect-error convert explicitly type to paragraph
          selectedNode = { ...anchorNode, type: 'paragraph' };
        } else {
          selectedNode = anchorNode;
        }
      }

      // Find the block key that matches the anchor node
      const anchorBlockKey = getKeys(blocks).find(
        (blockKey) => !Editor.isEditor(selectedNode) && blocks[blockKey].matchNode(selectedNode)
      );

      // Change the value selected in the dropdown if it doesn't match the anchor block key
      if (anchorBlockKey && anchorBlockKey !== blockSelected) {
        setBlockSelected(anchorBlockKey as SelectorBlockKey);
      }
    }
  }, [editor.selection, editor, blocks, blockSelected]);

  const Icon = blocks[blockSelected].icon;

  return (
    <>
      <SelectWrapper>
        <SingleSelect
          startIcon={<Icon />}
          onChange={handleSelect}
          placeholder={formatMessage(blocks[blockSelected].label)}
          value={blockSelected}
          onCloseAutoFocus={preventSelectFocus}
          aria-label={formatMessage({
            id: 'components.Blocks.blocks.selectBlock',
            defaultMessage: 'Select a block',
          })}
          disabled={disabled}
        >
          {blockKeysToInclude.map((key) => (
            <BlockOption
              key={key}
              value={key}
              label={blocks[key].label}
              icon={blocks[key].icon}
              blockSelected={blockSelected}
            />
          ))}
        </SingleSelect>
      </SelectWrapper>
      {modalElement}
    </>
  );
};

interface BlockOptionProps {
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGElement>>;
  label: MessageDescriptor;
  blockSelected: string;
}

const BlockOption = ({ value, icon: Icon, label, blockSelected }: BlockOptionProps) => {
  const { formatMessage } = useIntl();

  const isSelected = value === blockSelected;

  return (
    <SingleSelectOption
      startIcon={<Icon fill={isSelected ? 'primary600' : 'neutral600'} />}
      value={value}
    >
      {formatMessage(label)}
    </SingleSelectOption>
  );
};

const isListNode = (node: unknown): node is Block<'list'> => {
  return Node.isNode(node) && !Editor.isEditor(node) && node.type === 'list';
};

interface ListButtonProps {
  block: BlocksStore['list-ordered'] | BlocksStore['list-unordered'];
  format: Block<'list'>['format'];
  location?: 'toolbar' | 'menu';
}

const ListButton = ({ block, format, location = 'toolbar' }: ListButtonProps) => {
  const { editor, disabled, blocks } = useBlocksEditorContext('ListButton');
  const { formatMessage } = useIntl();

  const isListActive = () => {
    if (!editor.selection) return false;

    // Get the parent list at selection anchor node
    const currentListEntry = Editor.above(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
      at: editor.selection.anchor,
    });

    if (currentListEntry) {
      const [currentList] = currentListEntry;
      if (!Editor.isEditor(currentList) && isListNode(currentList) && currentList.format === format)
        return true;
    }
    return false;
  };

  /**
   * @TODO: Currently, applying list while multiple blocks are selected is not supported.
   * We should implement this feature in the future.
   */
  const isListDisabled = () => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    // Always enabled when there's no selection
    if (!editor.selection) {
      return false;
    }

    // Get the block node closest to the anchor and focus
    const anchorNodeEntry = Editor.above(editor, {
      at: editor.selection.anchor,
      match: (node) => !Editor.isEditor(node) && node.type !== 'text',
    });
    const focusNodeEntry = Editor.above(editor, {
      at: editor.selection.focus,
      match: (node) => !Editor.isEditor(node) && node.type !== 'text',
    });

    if (!anchorNodeEntry || !focusNodeEntry) {
      return false;
    }

    // Disabled if the anchor and focus are not in the same block
    return anchorNodeEntry[0] !== focusNodeEntry[0];
  };

  const toggleList = (format: Block<'list'>['format']) => {
    let currentListEntry;
    if (editor.selection) {
      currentListEntry = Editor.above(editor, {
        match: (node) => !Editor.isEditor(node) && node.type === 'list',
      });
    } else {
      // If no selection, toggle last inserted node
      const [_, lastNodePath] = Editor.last(editor, []);
      currentListEntry = Editor.above(editor, {
        match: (node) => !Editor.isEditor(node) && node.type === 'list',
        at: lastNodePath,
      });
    }

    if (!currentListEntry) {
      // If selection is not a list then convert it to list
      blocks[`list-${format}`].handleConvert!(editor);
      return;
    }

    // If selection is already a list then toggle format
    const [currentList, currentListPath] = currentListEntry;

    if (!Editor.isEditor(currentList) && isListNode(currentList)) {
      if (currentList.format !== format) {
        // Format is different, toggle list format
        Transforms.setNodes(editor, { format }, { at: currentListPath });
      } else {
        // Format is same, convert selected list-item to paragraph
        blocks['paragraph'].handleConvert!(editor);
      }
    }
  };

  if (location === 'menu') {
    const Icon = block.icon;

    return (
      <StyledMenuItem
        onSelect={() => toggleList(format)}
        isActive={isListActive()}
        disabled={isListDisabled()}
      >
        <Icon />
        {formatMessage(block.label)}
      </StyledMenuItem>
    );
  }

  return (
    <ToolbarButton
      icon={block.icon}
      name={format}
      label={block.label}
      isActive={isListActive()}
      disabled={isListDisabled()}
      handleClick={() => toggleList(format)}
    />
  );
};

const LinkButton = ({
  disabled,
  location = 'toolbar',
}: {
  disabled: boolean;
  location?: 'toolbar' | 'menu';
}) => {
  const { editor } = useBlocksEditorContext('LinkButton');
  const { formatMessage } = useIntl();

  const isLinkActive = () => {
    const { selection } = editor;

    if (!selection) return false;

    const [match] = Array.from(
      Editor.nodes(editor, {
        at: Editor.unhangRange(editor, selection),
        match: (node) => SlateElement.isElement(node) && node.type === 'link',
      })
    );

    return Boolean(match);
  };

  const isLinkDisabled = () => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    // Always enabled when there's no selection
    if (!editor.selection) {
      return false;
    }

    // Get the block node closest to the anchor and focus
    const anchorNodeEntry = Editor.above(editor, {
      at: editor.selection.anchor,
      match: (node) => !Editor.isEditor(node) && node.type !== 'text',
    });
    const focusNodeEntry = Editor.above(editor, {
      at: editor.selection.focus,
      match: (node) => !Editor.isEditor(node) && node.type !== 'text',
    });

    if (!anchorNodeEntry || !focusNodeEntry) {
      return false;
    }

    // Disabled if the anchor and focus are not in the same block
    return anchorNodeEntry[0] !== focusNodeEntry[0];
  };

  const addLink = () => {
    editor.shouldSaveLinkPath = true;
    // We insert an empty anchor, so we split the DOM to have a element we can use as reference for the popover
    insertLink(editor, { url: '' });
  };

  const label = {
    id: 'components.Blocks.link',
    defaultMessage: 'Link',
  } as MessageDescriptor;

  if (location === 'menu') {
    return (
      <StyledMenuItem onSelect={addLink} isActive={isLinkActive()} disabled={isLinkDisabled()}>
        <Link />
        {formatMessage(label)}
      </StyledMenuItem>
    );
  }

  return (
    <ToolbarButton
      icon={Link}
      name="link"
      label={label}
      isActive={isLinkActive()}
      handleClick={addLink}
      disabled={isLinkDisabled()}
    />
  );
};

interface ObservedToolbarComponentProps {
  index: number;
  lastVisibleIndex: number;
  setLastVisibleIndex: React.Dispatch<React.SetStateAction<number>>;
  rootRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

const ObservedToolbarComponent = ({
  index,
  lastVisibleIndex,
  setLastVisibleIndex,
  rootRef,
  children,
}: ObservedToolbarComponentProps) => {
  const isVisible = index <= lastVisibleIndex;

  const containerRef = useElementOnScreen<HTMLDivElement>(
    (isVisible) => {
      /**
       * It's the MoreMenu's job to make an item not visible when there's not room for it.
       * But we need to react here to the element becoming visible again.
       */
      if (isVisible) {
        setLastVisibleIndex((prev) => Math.max(prev, index));
      }
    },
    { threshold: 1, root: rootRef.current }
  );

  return (
    <div
      ref={containerRef}
      style={{
        /**
         * Use visibility so that the element occupies the space if requires even when there's not
         * enough room for it to be visible. The empty reserved space will be clipped by the
         * overflow:hidden rule on the parent, so it doesn't affect the UI.
         * This way we can keep observing its visiblity and react to browser resize events.
         */
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>
  );
};

interface ObservedComponent {
  toolbar: React.ReactNode;
  menu: React.ReactNode;
  key: string;
}

interface MoreMenuProps {
  setLastVisibleIndex: React.Dispatch<React.SetStateAction<number>>;
  hasHiddenItems: boolean;
  rootRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
}

const MoreMenu = ({ setLastVisibleIndex, hasHiddenItems, rootRef, children }: MoreMenuProps) => {
  const { formatMessage } = useIntl();
  const containerRef = useElementOnScreen<HTMLButtonElement>(
    (isVisible) => {
      // We only react to the menu becoming invisible. When that happens, we hide the last item.
      if (!isVisible) {
        /**
         * If there's no room for any item, the index can be -1.
         * This is intentional, in that case only the more menu will be visible.
         **/
        setLastVisibleIndex((prev) => prev - 1);
      }
    },
    { threshold: 1, root: rootRef.current }
  );

  return (
    <Menu.Root defaultOpen={false}>
      <Menu.Trigger
        endIcon={null}
        paddingLeft={0}
        paddingRight={0}
        ref={containerRef}
        style={{ visibility: hasHiddenItems ? 'visible' : 'hidden' }}
      >
        <IconButton
          variant="ghost"
          label={formatMessage({ id: 'global.more', defaultMessage: 'More' })}
          tag="span"
        >
          <More aria-hidden focusable={false} />
        </IconButton>
      </Menu.Trigger>
      <Menu.Content onCloseAutoFocus={(e) => e.preventDefault()}>{children}</Menu.Content>
    </Menu.Root>
  );
};

const StyledMenuItem = styled(Menu.Item)<{ isActive: boolean }>`
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary100};
  }

  ${(props) =>
    props.isActive &&
    css`
      font-weight: bold;
      background-color: ${({ theme }) => theme.colors.primary100};
      color: ${({ theme }) => theme.colors.primary600};
      font-weight: bold;
    `}

  > span {
    display: inline-flex;
    gap: ${({ theme }) => theme.spaces[2]};
    align-items: center;
  }

  svg {
    fill: ${({ theme, isActive }) =>
      isActive ? theme.colors.primary600 : theme.colors.neutral600};
  }
`;

const BlocksToolbar = () => {
  const { editor, blocks, modifiers, disabled } = useBlocksEditorContext('BlocksToolbar');
  const { formatMessage } = useIntl();

  /**
   * The modifier buttons are disabled when an image is selected.
   */
  const checkButtonDisabled = () => {
    // Always disabled when the whole editor is disabled
    if (disabled) {
      return true;
    }

    if (!editor.selection) {
      return false;
    }

    const selectedNode = editor.children[editor.selection.anchor.path[0]];

    if (['image', 'code'].includes(selectedNode.type)) {
      return true;
    }

    return false;
  };

  const isButtonDisabled = checkButtonDisabled();

  /**
   * Observed components are ones that may or may not be visible in the toolbar, depending on the
   * available space. They provide two render props:
   * - renderInToolbar: for when we try to render the component in the toolbar (may be hidden)
   * - renderInMenu: for when the component didn't fit in the toolbar and is relegated
   *   to the "more" menu
   */
  const observedComponents: ObservedComponent[] = [
    ...Object.entries(modifiers).map(([name, modifier]) => {
      const Icon = modifier.icon;
      const isActive = modifier.checkIsActive(editor);
      const handleSelect = () => modifier.handleToggle(editor);

      return {
        toolbar: (
          <ToolbarButton
            key={name}
            name={name}
            icon={modifier.icon}
            label={modifier.label}
            isActive={modifier.checkIsActive(editor)}
            handleClick={handleSelect}
            disabled={isButtonDisabled}
          />
        ),
        menu: (
          <StyledMenuItem onSelect={handleSelect} isActive={isActive}>
            <Icon />
            {formatMessage(modifier.label)}
          </StyledMenuItem>
        ),
        key: `modifier.${name}`,
      };
    }),
    {
      toolbar: <LinkButton disabled={isButtonDisabled} location="toolbar" />,
      menu: <LinkButton disabled={isButtonDisabled} location="menu" />,
      key: 'block.link',
    },
    {
      // List buttons can only be rendered together when in the toolbar
      toolbar: (
        <Flex direction="row" gap={1}>
          <ToolbarSeparator />
          <Toolbar.ToggleGroup type="single" asChild>
            <Flex gap={1}>
              <ListButton block={blocks['list-unordered']} format="unordered" location="toolbar" />
              <ListButton block={blocks['list-ordered']} format="ordered" location="toolbar" />
            </Flex>
          </Toolbar.ToggleGroup>
        </Flex>
      ),
      menu: (
        <>
          <Menu.Separator />
          <ListButton block={blocks['list-unordered']} format="unordered" location="menu" />
          <ListButton block={blocks['list-ordered']} format="ordered" location="menu" />
        </>
      ),
      key: 'block.list',
    },
  ];

  return (
    <Toolbar.Root aria-disabled={disabled} asChild>
      <ToolbarWrapper gap={2} padding={2} width="100%">
        <BlocksDropdown />
        <ToolbarSeparator />
        <Toolbar.ToggleGroup type="multiple" asChild>
          <Flex direction="row" gap={1} grow={1} overflow="hidden">
            <EditorToolbarObserver observedComponents={observedComponents} />
          </Flex>
        </Toolbar.ToggleGroup>
      </ToolbarWrapper>
    </Toolbar.Root>
  );
};

export { BlocksToolbar, useConversionModal };
