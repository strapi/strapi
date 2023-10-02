import * as React from 'react';

import { Box, Typography, BaseLink } from '@strapi/design-system';
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
} from '@strapi/icons';
import PropTypes from 'prop-types';
import { Editor, Path, Transforms } from 'slate';
import styled, { css } from 'styled-components';

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

const Heading = ({ attributes, children, element }) => {
  switch (element.level) {
    case 1:
      return <H1 {...attributes}>{children}</H1>;
    case 2:
      return <H2 {...attributes}>{children}</H2>;
    case 3:
      return <H3 {...attributes}>{children}</H3>;
    case 4:
      return <H4 {...attributes}>{children}</H4>;
    case 5:
      return <H5 {...attributes}>{children}</H5>;
    case 6:
      return <H6 {...attributes}>{children}</H6>;
    default: // do nothing
      return null;
  }
};

Heading.propTypes = {
  attributes: PropTypes.object.isRequired,
  children: PropTypes.node.isRequired,
  element: PropTypes.shape({
    level: PropTypes.oneOf([1, 2, 3, 4, 5, 6]).isRequired,
  }).isRequired,
};

const CodeBlock = styled.pre.attrs({ role: 'code' })`
  border-radius: ${({ theme }) => theme.borderRadius};
  background-color: #32324d; // since the color is same between the themes
  max-width: 100%;
  overflow: auto;
  padding: ${({ theme }) => theme.spaces[2]};
  & > code {
    color: #839496; // TODO: to confirm with design and get theme color
    overflow: auto;
    max-width: 100%;
    padding: ${({ theme }) => theme.spaces[2]};
  }
`;

const Blockquote = styled.blockquote.attrs({ role: 'blockquote' })`
  margin: ${({ theme }) => `${theme.spaces[6]} 0`};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  border-left: ${({ theme }) => `${theme.spaces[1]} solid ${theme.colors.neutral150}`};
  font-style: italic;
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[5]};
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

const Img = styled.img`
  max-width: 100%;
`;

const Image = ({ attributes, children, element }) => {
  if (!element.image) return null;
  const { url, alternativeText, width, height } = element.image;

  return (
    <Box {...attributes}>
      {children}
      <Box contentEditable={false}>
        <Img src={url} alt={alternativeText} width={width} height={height} />
      </Box>
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

/**
 * Common handler for the enter key on ordered and unordered lists
 * @param {import('slate').Editor} editor
 */
const handleEnterKeyOnList = (editor) => {
  // Check if the selected list item is empty
  const [currentListItem, currentListItemPath] = Editor.above(editor, {
    matchNode: (node) => node.type === 'list-item',
  });
  const isEmptyListItem =
    currentListItem.children.length === 1 && currentListItem.children[0].text === '';

  if (isEmptyListItem) {
    // Delete the empty list item
    Transforms.removeNodes(editor, { at: currentListItemPath });

    // And create a new paragraph below the parent list
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

    // Move selection to the newly created paragraph
    Transforms.select(editor, createdParagraphPath);
  } else {
    // Otherwise just create a new list item by splitting the current one
    Transforms.splitNodes(editor, { always: true });
  }
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
        /**
         * Split the nodes where the cursor is. This will create a new paragraph with the content
         * after the cursor, while retaining all the children, modifiers etc.
         */
        Transforms.splitNodes(editor, {
          /**
           * Makes sure we always create a new node,
           * even if there's nothing to the right of the cursor in the node.
           */
          always: true,
        });

        /**
         * Delete and recreate the node that was created at the right of the cursor.
         * This is to avoid node pollution
         * (e.g. keeping the level attribute when converting a heading to a paragraph).
         * Select the parent of the selection because we want the full block, not the leaf.
         * And copy its children to make sure we keep the modifiers.
         */
        const [createdNode] = Editor.parent(editor, editor.selection.anchor.path);
        Transforms.removeNodes(editor, editor.selection);
        Transforms.insertNodes(editor, {
          type: 'paragraph',
          children: createdNode.children,
        });

        /**
         * The new selection will by default be at the end of the created node.
         * Instead we manually move it to the start of the created node.
         * Use slice(0, -1) to go 1 level higher in the tree,
         * so we go to the start of the node and not the start of the leaf.
         */
        Transforms.select(editor, editor.start(editor.selection.anchor.path.slice(0, -1)));
      },
    },
    'heading-one': {
      renderElement: (props) => <Heading {...props} />,
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
      renderElement: (props) => <Heading {...props} />,
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
      renderElement: (props) => <Heading {...props} />,
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
      renderElement: (props) => <Heading {...props} />,
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
      renderElement: (props) => <Heading {...props} />,
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
      renderElement: (props) => <Heading {...props} />,
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
    link: {
      renderElement: (props) => (
        <BaseLink href={props.element.url} {...props.attributes}>
          {props.children}
        </BaseLink>
      ),
      value: {
        type: 'link',
      },
      matchNode: (node) => node.type === 'link',
      isInBlocksSelector: false,
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
    },
    'list-ordered': {
      renderElement: (props) => <List {...props} />,
      value: {
        type: 'list',
        format: 'ordered',
      },
      matchNode: (node) => node.type === 'list' && node.format === 'ordered',
      // TODO add icon and label and set isInBlocksEditor to true
      isInBlocksSelector: false,
      handleEnterKey: handleEnterKeyOnList,
    },
    'list-unordered': {
      renderElement: (props) => <List {...props} />,
      value: {
        type: 'list',
        format: 'unordered',
      },
      matchNode: (node) => node.type === 'list' && node.format === 'unordered',
      // TODO add icon and label and set isInBlocksEditor to true
      isInBlocksSelector: false,
      handleEnterKey: handleEnterKeyOnList,
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
  };
}
