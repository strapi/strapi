import * as React from 'react';

import {
  Box,
  Icon,
  Typography,
  BaseLink,
  Popover,
  Field,
  FieldLabel,
  FieldInput,
  Flex,
  Button,
  Tooltip,
} from '@strapi/design-system';
import {
  Code,
  Quote,
  Picture,
  Paragraph,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  HeadingFour,
  HeadingFive,
  HeadingSix,
  Trash,
  Pencil,
  BulletList,
  NumberList,
} from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Editor, Path, Transforms, Range } from 'slate';
import { useSlate, ReactEditor } from 'slate-react';
import styled, { css } from 'styled-components';

import { composeRefs } from '../../../utils';
import { editLink, removeLink } from '../utils/links';

const StyledBaseLink = styled(BaseLink)`
  text-decoration: none;
`;

const H1 = styled(Typography).attrs({ as: 'h1' })`
  font-size: ${42 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const H2 = styled(Typography).attrs({ as: 'h2' })`
  font-size: ${35 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const H3 = styled(Typography).attrs({ as: 'h3' })`
  font-size: ${29 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const H4 = styled(Typography).attrs({ as: 'h4' })`
  font-size: ${24 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const H5 = styled(Typography).attrs({ as: 'h5' })`
  font-size: ${20 / 16}rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const H6 = styled(Typography).attrs({ as: 'h6' })`
  font-size: 1rem;
  line-height: ${({ theme }) => theme.lineHeights[1]};
`;

const CodeBlock = styled.pre.attrs({ role: 'code' })`
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: ${({ theme }) => theme.colors.neutral100};
  max-width: 100%;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  flex-shrink: 0;
  & > code {
    font-family: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas,
      monospace;
    color: ${({ theme }) => theme.colors.neutral800};
    overflow: auto;
    max-width: 100%;
  }
`;

const Blockquote = styled.blockquote.attrs({ role: 'blockquote' })`
  margin: ${({ theme }) => `${theme.spaces[4]} 0`};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  border-left: ${({ theme }) => `${theme.spaces[1]} solid ${theme.colors.neutral200}`};
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[5]};
  color: ${({ theme }) => theme.colors.neutral600};
`;

const listStyle = css`
  margin-block-start: ${({ theme }) => theme.spaces[4]};
  margin-block-end: ${({ theme }) => theme.spaces[4]};
  margin-inline-start: ${({ theme }) => theme.spaces[0]};
  margin-inline-end: ${({ theme }) => theme.spaces[0]};
  padding-inline-start: ${({ theme }) => theme.spaces[4]};

  ol,
  ul {
    margin-block-start: ${({ theme }) => theme.spaces[0]};
    margin-block-end: ${({ theme }) => theme.spaces[0]};
  }
`;

const Orderedlist = styled.ol`
  list-style-type: decimal;
  ${listStyle}
`;

const Unorderedlist = styled.ul`
  list-style-type: disc;
  ${listStyle}
`;

const List = ({ attributes, children, element }) => {
  if (element.format === 'ordered') return <Orderedlist {...attributes}>{children}</Orderedlist>;

  return <Unorderedlist {...attributes}>{children}</Unorderedlist>;
};

List.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  element: PropTypes.shape({
    format: PropTypes.string.isRequired,
  }).isRequired,
};

/**
 * @param {import('slate').Editor} editor
 * @param {Path} currentListPath
 */
const replaceListWithEmptyBlock = (editor, currentListPath) => {
  // Delete the empty list
  Transforms.removeNodes(editor, { at: currentListPath });

  if (currentListPath[0] === 0) {
    // If the list was the only (or first) block element then insert empty paragraph as editor needs default value
    Transforms.insertNodes(
      editor,
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      { at: currentListPath }
    );
    Transforms.select(editor, currentListPath);
  }
};

/**
 * Common handler for the backspace event on ordered and unordered lists
 * @param {import('slate').Editor} editor
 * @param {Event} event
 */
const handleBackspaceKeyOnList = (editor, event) => {
  const [currentListItem, currentListItemPath] = Editor.parent(editor, editor.selection.anchor);
  const [currentList, currentListPath] = Editor.parent(editor, currentListItemPath);
  const isListEmpty = currentList.children.length === 1 && currentListItem.children[0].text === '';
  const isNodeStart = Editor.isStart(editor, editor.selection.anchor, currentListItemPath);
  const isFocusAtTheBeginningOfAChild =
    editor.selection.focus.offset === 0 && editor.selection.focus.path.at(-1) === 0;

  if (isListEmpty) {
    event.preventDefault();
    replaceListWithEmptyBlock(editor, currentListPath);
  } else if (isNodeStart) {
    Transforms.liftNodes(editor, {
      match: (n) => n.type === 'list-item',
    });
    // Transforms the list item into a paragraph
    Transforms.setNodes(
      editor,
      { type: 'paragraph' },
      {
        hanging: true,
      }
    );
  } else if (isFocusAtTheBeginningOfAChild) {
    Transforms.liftNodes(editor, {
      match: (n) => n.type === 'list-item',
    });
    // If the focus is at the beginning of a child node we need to replace it with a paragraph
    Transforms.setNodes(editor, { type: 'paragraph' });
  }
};

/**
 * Common handler for the enter key on ordered and unordered lists
 * @param {import('slate').Editor} editor
 */
const handleEnterKeyOnList = (editor) => {
  const [currentListItem, currentListItemPath] = Editor.above(editor, {
    matchNode: (node) => node.type === 'list-item',
  });
  const [currentList, currentListPath] = Editor.parent(editor, currentListItemPath);
  const isListEmpty = currentList.children.length === 1 && currentListItem.children[0].text === '';
  const isListItemEmpty =
    currentListItem.children.length === 1 && currentListItem.children[0].text === '';

  if (isListEmpty) {
    replaceListWithEmptyBlock(editor, currentListPath);
  } else if (isListItemEmpty) {
    // Delete the empty list item
    Transforms.removeNodes(editor, { at: currentListItemPath });

    // Create a new paragraph below the parent list
    const listNodeEntry = Editor.above(editor, { match: (n) => n.type === 'list' });
    const createdParagraphPath = Path.next(listNodeEntry[1]);
    Transforms.insertNodes(
      editor,
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      { at: createdParagraphPath }
    );

    // Move the selection to the newly created paragraph
    Transforms.select(editor, createdParagraphPath);
  } else {
    // Check if the cursor is at the end of the list item
    const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, currentListItemPath);

    if (isNodeEnd) {
      // If there was nothing after the cursor, create a fresh new list item,
      // in order to avoid carrying over the modifiers from the previous list item
      Transforms.insertNodes(editor, { type: 'list-item', children: [{ type: 'text', text: '' }] });
    } else {
      // If there is something after the cursor, split the current list item,
      // so that we keep the content and the modifiers
      Transforms.splitNodes(editor);
    }
  }
};

// The max-height is decided with the design team, the 56px is the height of the toolbar
const Img = styled.img`
  max-height: calc(512px - 56px);
  max-width: 100%;
  object-fit: contain;
`;

// Added a background color to the image wrapper to make it easier to recognize the image block
const Image = ({ attributes, children, element }) => {
  if (!element.image) return null;
  const { url, alternativeText, width, height } = element.image;

  return (
    <Box {...attributes}>
      {children}
      <Flex background="neutral100" contentEditable={false} justifyContent="center">
        <Img src={url} alt={alternativeText} width={width} height={height} />
      </Flex>
    </Box>
  );
};

Image.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  element: PropTypes.shape({
    image: PropTypes.shape({
      url: PropTypes.string.isRequired,
      alternativeText: PropTypes.string,
      width: PropTypes.number,
      height: PropTypes.number,
    }),
  }).isRequired,
};

// Make sure the tooltip is above the popover
const TooltipCustom = styled(Tooltip)`
  z-index: 6;
`;

// Used for the Edit and Cancel buttons in the link popover
const CustomButton = styled(Button)`
  & > span {
    line-height: normal;
  }
`;

const Link = React.forwardRef(({ element, children, ...attributes }, forwardedRef) => {
  const { formatMessage } = useIntl();
  const editor = useSlate();
  const path = ReactEditor.findPath(editor, element);
  const [popoverOpen, setPopoverOpen] = React.useState(
    editor.lastInsertedLinkPath ? Path.equals(path, editor.lastInsertedLinkPath) : false
  );
  const [isEditing, setIsEditing] = React.useState(element.url === '');
  const linkRef = React.useRef(null);
  const elementText = element.children.map((child) => child.text).join('');
  const [linkText, setLinkText] = React.useState(elementText);
  const [linkUrl, setLinkUrl] = React.useState(element.url);

  const handleOpenEditPopover = (e) => {
    e.preventDefault();
    setPopoverOpen(true);
  };

  const handleSave = (e) => {
    e.stopPropagation();

    // If the selection is collapsed, we select the parent node because we want all the link to be replaced
    if (Range.isCollapsed(editor.selection)) {
      const [, parentPath] = Editor.parent(editor, editor.selection.focus?.path);
      Transforms.select(editor, parentPath);
    }

    editLink(editor, { url: linkUrl, text: linkText });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);

    if (element.url === '') {
      removeLink(editor);
    }
  };

  const handleDismiss = () => {
    setPopoverOpen(false);

    if (element.url === '') {
      removeLink(editor);
    }

    ReactEditor.focus(editor);
  };

  const composedRefs = composeRefs(linkRef, forwardedRef);

  return (
    <>
      <StyledBaseLink
        {...attributes}
        ref={composedRefs}
        href={element.url}
        onClick={handleOpenEditPopover}
        color="primary600"
      >
        {children}
      </StyledBaseLink>
      {popoverOpen && (
        <Popover source={linkRef} onDismiss={handleDismiss} padding={4} contentEditable={false}>
          {isEditing ? (
            <Flex as="form" onSubmit={handleSave} direction="column" gap={4}>
              <Field width="300px">
                <FieldLabel>
                  {formatMessage({
                    id: 'components.Blocks.popover.text',
                    defaultMessage: 'Text',
                  })}
                </FieldLabel>
                <FieldInput
                  name="text"
                  placeholder={formatMessage({
                    id: 'components.Blocks.popover.text.placeholder',
                    defaultMessage: 'Enter link text',
                  })}
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
              </Field>
              <Field width="300px">
                <FieldLabel>
                  {formatMessage({
                    id: 'components.Blocks.popover.link',
                    defaultMessage: 'Link',
                  })}
                </FieldLabel>
                <FieldInput
                  name="url"
                  placeholder="https://strapi.io"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                />
              </Field>
              <Flex justifyContent="end" width="100%" gap={2}>
                <Button variant="tertiary" onClick={handleCancel}>
                  {formatMessage({
                    id: 'components.Blocks.popover.cancel',
                    defaultMessage: 'Cancel',
                  })}
                </Button>
                <Button type="submit" disabled={!linkText || !linkUrl}>
                  {formatMessage({
                    id: 'components.Blocks.popover.save',
                    defaultMessage: 'Save',
                  })}
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Flex direction="column" gap={4} alignItems="start" width="400px">
              <Typography>{elementText}</Typography>
              <Typography>
                <StyledBaseLink href={element.url} target="_blank" color="primary600">
                  {element.url}
                </StyledBaseLink>
              </Typography>
              <Flex justifyContent="end" width="100%" gap={2}>
                <TooltipCustom
                  description={formatMessage({
                    id: 'components.Blocks.popover.delete',
                    defaultMessage: 'Delete',
                  })}
                >
                  <CustomButton
                    size="S"
                    width="2rem"
                    variant="danger-light"
                    onClick={() => removeLink(editor)}
                    aria-label={formatMessage({
                      id: 'components.Blocks.popover.delete',
                      defaultMessage: 'Delete',
                    })}
                    type="button"
                    justifyContent="center"
                  >
                    <Icon width={3} height={3} as={Trash} />
                  </CustomButton>
                </TooltipCustom>

                <TooltipCustom
                  description={formatMessage({
                    id: 'components.Blocks.popover.edit',
                    defaultMessage: 'Edit',
                  })}
                >
                  <CustomButton
                    size="S"
                    width="2rem"
                    variant="tertiary"
                    onClick={() => setIsEditing(true)}
                    aria-label={formatMessage({
                      id: 'components.Blocks.popover.edit',
                      defaultMessage: 'Edit',
                    })}
                    type="button"
                    justifyContent="center"
                  >
                    <Icon width={3} height={3} as={Pencil} />
                  </CustomButton>
                </TooltipCustom>
              </Flex>
            </Flex>
          )}
        </Popover>
      )}
    </>
  );
});

Link.propTypes = {
  element: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
};

/**
 * Manages a store of all the available blocks.
 *
 * @returns {{
 *   [key: string]: {
 *     renderElement: (props: Object) => JSX.Element,
 *     icon: React.ComponentType,
 *     label: {id: string, defaultMessage: string},
 *     value: Object,
 *     matchNode: (node: Object) => boolean,
 *     isInBlocksSelector: true,
 *     handleEnterKey: (editor: import('slate').Editor) => void,
 *     handleBackspaceKey?:(editor: import('slate').Editor, event: Event) => void,
 *   }
 * }} an object containing rendering functions and metadata for different blocks, indexed by name.
 */
export function useBlocksStore() {
  return {
    paragraph: {
      renderElement: (props) => (
        <Typography as="p" variant="omega" {...props.attributes}>
          {props.children}
        </Typography>
      ),
      icon: Paragraph,
      label: {
        id: 'components.Blocks.blocks.text',
        defaultMessage: 'Text',
      },
      value: {
        type: 'paragraph',
      },
      matchNode: (node) => node.type === 'paragraph',
      isInBlocksSelector: true,
      handleEnterKey(editor) {
        // We need to keep track of the initial position of the cursor
        const anchorPathInitialPosition = editor.selection.anchor.path;
        /**
         * Split the nodes where the cursor is. This will create a new paragraph with the content
         * after the cursor, while retaining all the children, modifiers etc.
         */
        Transforms.splitNodes(editor, {
          // Makes sure we always create a new node,
          // even if there's nothing to the right of the cursor in the node.
          always: true,
        });

        // Check if the created node is empty (if there was no text after the cursor in the node)
        // This lets us know if we need to carry over the modifiers from the previous node
        const [, parentBlockPath] = Editor.above(editor, {
          match: (n) => n.type !== 'text',
        });
        const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, parentBlockPath);

        /**
         * Delete and recreate the node that was created at the right of the cursor.
         * This is to avoid node pollution
         * (e.g. keeping the level attribute when converting a heading to a paragraph).
         * Select the parent of the selection because we want the full block, not the leaf.
         * And copy its children to make sure we keep the modifiers.
         */
        const [fragmentedNode] = Editor.parent(editor, editor.selection.anchor.path);
        Transforms.removeNodes(editor, editor.selection);

        // Check if after the current position there is another node
        const hasNextNode = editor.children.length - anchorPathInitialPosition[0] > 1;

        // Insert the new node at the right position.
        // The next line after the editor selection if present or otherwise at the end of the editor.
        Transforms.insertNodes(
          editor,
          {
            type: 'paragraph',
            // Don't carry over the modifiers from the previous node if there was no text after the cursor
            children: isNodeEnd ? [{ type: 'text', text: '' }] : fragmentedNode.children,
          },
          {
            at: hasNextNode ? [anchorPathInitialPosition[0] + 1] : [editor.children.length],
          }
        );

        /**
         * The new selection will by default be at the end of the created node.
         * Instead we manually move it to the start of the created node.
         * Use slice(0, -1) to go 1 level higher in the tree,
         * so we go to the start of the node and not the start of the leaf.
         */
        Transforms.select(editor, editor.start([anchorPathInitialPosition[0] + 1]));
      },
    },
    'heading-one': {
      renderElement: (props) => <H1 {...props.attributes}>{props.children}</H1>,
      icon: HeadingOne,
      label: {
        id: 'components.Blocks.blocks.heading1',
        defaultMessage: 'Heading 1',
      },
      value: {
        type: 'heading',
        level: 1,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 1,
      isInBlocksSelector: true,
    },
    'heading-two': {
      renderElement: (props) => <H2 {...props.attributes}>{props.children}</H2>,
      icon: HeadingTwo,
      label: {
        id: 'components.Blocks.blocks.heading2',
        defaultMessage: 'Heading 2',
      },
      value: {
        type: 'heading',
        level: 2,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 2,
      isInBlocksSelector: true,
    },
    'heading-three': {
      renderElement: (props) => <H3 {...props.attributes}>{props.children}</H3>,
      icon: HeadingThree,
      label: {
        id: 'components.Blocks.blocks.heading3',
        defaultMessage: 'Heading 3',
      },
      value: {
        type: 'heading',
        level: 3,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 3,
      isInBlocksSelector: true,
    },
    'heading-four': {
      renderElement: (props) => <H4 {...props.attributes}>{props.children}</H4>,
      icon: HeadingFour,
      label: {
        id: 'components.Blocks.blocks.heading4',
        defaultMessage: 'Heading 4',
      },
      value: {
        type: 'heading',
        level: 4,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 4,
      isInBlocksSelector: true,
    },
    'heading-five': {
      renderElement: (props) => <H5 {...props.attributes}>{props.children}</H5>,
      icon: HeadingFive,
      label: {
        id: 'components.Blocks.blocks.heading5',
        defaultMessage: 'Heading 5',
      },
      value: {
        type: 'heading',
        level: 5,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 5,
      isInBlocksSelector: true,
    },
    'heading-six': {
      renderElement: (props) => <H6 {...props.attributes}>{props.children}</H6>,
      icon: HeadingSix,
      label: {
        id: 'components.Blocks.blocks.heading6',
        defaultMessage: 'Heading 6',
      },
      value: {
        type: 'heading',
        level: 6,
      },
      matchNode: (node) => node.type === 'heading' && node.level === 6,
      isInBlocksSelector: true,
    },
    'list-ordered': {
      renderElement: (props) => <List {...props} />,
      label: {
        id: 'components.Blocks.blocks.orderedList',
        defaultMessage: 'Numbered list',
      },
      value: {
        type: 'list',
        format: 'ordered',
      },
      icon: NumberList,
      matchNode: (node) => node.type === 'list' && node.format === 'ordered',
      isInBlocksSelector: true,
      handleEnterKey: handleEnterKeyOnList,
      handleBackspaceKey: handleBackspaceKeyOnList,
    },
    'list-unordered': {
      renderElement: (props) => <List {...props} />,
      label: {
        id: 'components.Blocks.blocks.unorderedList',
        defaultMessage: 'Bulleted list',
      },
      value: {
        type: 'list',
        format: 'unordered',
      },
      icon: BulletList,
      matchNode: (node) => node.type === 'list' && node.format === 'unordered',
      isInBlocksSelector: true,
      handleEnterKey: handleEnterKeyOnList,
      handleBackspaceKey: handleBackspaceKeyOnList,
    },
    'list-item': {
      renderElement: (props) => (
        <Typography as="li" {...props.attributes}>
          {props.children}
        </Typography>
      ),
      value: {
        type: 'list-item',
      },
      matchNode: (node) => node.type === 'list-item',
      isInBlocksSelector: false,
    },
    link: {
      renderElement: (props) => (
        <Link element={props.element} {...props.attributes}>
          {props.children}
        </Link>
      ),
      value: {
        type: 'link',
      },
      matchNode: (node) => node.type === 'link',
      isInBlocksSelector: false,
    },
    image: {
      renderElement: (props) => <Image {...props} />,
      icon: Picture,
      label: {
        id: 'components.Blocks.blocks.image',
        defaultMessage: 'Image',
      },
      value: {
        type: 'image',
      },
      matchNode: (node) => node.type === 'image',
      isInBlocksSelector: true,
    },
    quote: {
      renderElement: (props) => <Blockquote {...props.attributes}>{props.children}</Blockquote>,
      icon: Quote,
      label: {
        id: 'components.Blocks.blocks.quote',
        defaultMessage: 'Quote',
      },
      value: {
        type: 'quote',
      },
      matchNode: (node) => node.type === 'quote',
      isInBlocksSelector: true,
      handleEnterKey(editor) {
        /**
         * To determine if we should break out of the quote node, check 2 things:
         * 1. If the cursor is at the end of the quote node
         * 2. If the last line of the quote node is empty
         */
        const [quoteNode, quoteNodePath] = Editor.above(editor, {
          match: (n) => n.type === 'quote',
        });
        const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, quoteNodePath);
        const isEmptyLine = quoteNode.children.at(-1).text.endsWith('\n');

        if (isNodeEnd && isEmptyLine) {
          // Remove the last line break
          Transforms.delete(editor, { distance: 1, unit: 'character', reverse: true });
          // Break out of the quote node new paragraph
          Transforms.insertNodes(editor, {
            type: 'paragraph',
            children: [{ type: 'text', text: '' }],
          });
        } else {
          // Otherwise insert a new line within the quote node
          Transforms.insertText(editor, '\n');

          // If there's nothing after the cursor, disable modifiers
          if (isNodeEnd) {
            Editor.removeMark(editor, 'bold');
            Editor.removeMark(editor, 'italic');
          }
        }
      },
    },
    code: {
      renderElement: (props) => (
        <CodeBlock {...props.attributes}>
          <code>{props.children}</code>
        </CodeBlock>
      ),
      icon: Code,
      label: {
        id: 'components.Blocks.blocks.code',
        defaultMessage: 'Code',
      },
      value: {
        type: 'code',
      },
      matchNode: (node) => node.type === 'code',
      isInBlocksSelector: true,
      handleEnterKey(editor) {
        // Insert a new line within the block
        Transforms.insertText(editor, '\n');
      },
    },
  };
}
