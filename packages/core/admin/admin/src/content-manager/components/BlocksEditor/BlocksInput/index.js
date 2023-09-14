import * as React from 'react';

import { Box, Typography, BaseLink } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { Editable } from 'slate-react';
import styled, { css, useTheme } from 'styled-components';

import { useModifiersStore } from '../hooks/useModifiersStore';

const getEditorStyle = (theme) => ({
  // The outline style is set on the wrapper with :focus-within
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spaces[2],
});

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

const Img = styled.img`
  max-width: 100%;
`;

const CodeBlock = styled.pre`
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

const Blockquote = styled.blockquote`
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

const Image = ({ attributes, children, element }) => {
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

const List = ({ attributes, children, element }) => {
  if (element.format === 'ordered') return <Orderedlist {...attributes}>{children}</Orderedlist>;

  return <Unorderedlist {...attributes}>{children}</Unorderedlist>;
};

const renderElement = (props) => {
  const { attributes, element, children } = props;

  switch (element.type) {
    case 'heading':
      return <Heading {...props} />;
    case 'link':
      return (
        <BaseLink href={element.url} {...attributes}>
          {children}
        </BaseLink>
      );
    case 'code':
      return (
        <CodeBlock {...attributes}>
          <code>{children}</code>
        </CodeBlock>
      );
    case 'quote':
      return <Blockquote {...attributes}>{children}</Blockquote>;
    case 'list':
      return <List {...props} />;
    case 'list-item':
      return (
        <Typography as="li" {...attributes}>
          {children}
        </Typography>
      );
    case 'image':
      return <Image {...props} />;
    default:
      return (
        <Typography as="p" variant="omega" {...attributes}>
          {children}
        </Typography>
      );
  }
};

const baseRenderLeaf = ({ children, attributes, leaf }, modifiers) => {
  // Recursively wrap the children for each active modifier
  const wrappedChildren = modifiers.reduce((currentChildren, modifier) => {
    if (leaf[modifier.name]) {
      return modifier.renderLeaf(currentChildren);
    }

    return currentChildren;
  }, children);

  return <span {...attributes}>{wrappedChildren}</span>;
};

const BlocksInput = ({ readOnly }) => {
  const modifiers = useModifiersStore();
  const theme = useTheme();

  const renderLeaf = React.useCallback(
    (renderLeafProps) => baseRenderLeaf(renderLeafProps, modifiers),
    [modifiers]
  );

  return (
    <Editable
      readOnly={readOnly}
      style={getEditorStyle(theme)}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
    />
  );
};

BlocksInput.propTypes = {
  readOnly: PropTypes.bool.isRequired,
};

export default BlocksInput;
