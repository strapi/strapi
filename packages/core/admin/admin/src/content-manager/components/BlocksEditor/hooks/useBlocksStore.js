import * as React from 'react';

import { Box, Typography, BaseLink } from '@strapi/design-system';
import PropTypes from 'prop-types';
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
    }).isRequired,
  }).isRequired,
};

export function useBlocksStore() {
  return [
    {
      type: 'text',
      renderElement: (props) => (
        <Typography variant="omega" {...props.attributes}>
          {props.children}
        </Typography>
      ),
    },
    {
      type: 'paragraph',
      renderElement: (props) => (
        <Typography as="p" variant="omega" {...props.attributes}>
          {props.children}
        </Typography>
      ),
    },
    {
      type: 'heading',
      renderElement: (props) => <Heading {...props} />,
    },
    {
      type: 'link',
      renderElement: (props) => (
        <BaseLink href={props.element.url} {...props.attributes}>
          {props.children}
        </BaseLink>
      ),
    },
    {
      type: 'code',
      renderElement: (props) => (
        <CodeBlock {...props.attributes}>
          <code>{props.children}</code>
        </CodeBlock>
      ),
    },
    {
      type: 'quote',
      renderElement: (props) => <Blockquote {...props.attributes}>{props.children}</Blockquote>,
    },
    {
      type: 'list',
      renderElement: (props) => <List {...props} />,
    },
    {
      type: 'list-item',
      renderElement: (props) => (
        <Typography as="li" {...props.attributes}>
          {props.children}
        </Typography>
      ),
    },
    {
      type: 'image',
      renderElement: (props) => <Image {...props} />,
    },
  ];
}
