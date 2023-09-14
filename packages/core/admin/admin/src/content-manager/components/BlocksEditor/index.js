/* eslint-disable react/prop-types */
import * as React from 'react';

import { Box, Flex, Typography, InputWrapper, Divider, BaseLink } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import styled, { useTheme, css } from 'styled-components';

import { useModifiers } from './hooks/useModifiers';
import { blocksData } from './tempSchema';
import { BlocksToolbar } from './Toolbar';

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

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const EditorDivider = styled(Divider)`
  background: ${({ theme }) => theme.colors.neutral200};
`;

const Wrapper = styled(Box)`
  width: 100%;
  max-height: 512px;
  overflow: auto;
  padding: ${({ theme }) => `${theme.spaces[3]} ${theme.spaces[4]}`};
  font-size: ${({ theme }) => theme.fontSizes[2]};
  background-color: ${({ theme }) => theme.colors.neutral0};
  color: ${({ theme }) => theme.colors.neutral800};
  line-height: ${({ theme }) => theme.lineHeights[6]};
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const getEditorStyle = (theme) => ({
  // The outline style is set on the wrapper with :focus-within
  outline: 'none',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spaces[2],
});

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

const BlocksEditor = React.forwardRef(({ intlLabel, name, readOnly, required, error }, ref) => {
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const [editor] = React.useState(() => withReact(createEditor()));

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  /** Editable is not able to hold the ref, https://github.com/ianstormtaylor/slate/issues/4082
   *  so with "useImperativeHandle" we can use ReactEditor methods to expose to the parent above
   *  also not passing forwarded ref here, gives console warning.
   */
  React.useImperativeHandle(
    ref,
    () => ({
      focus() {
        ReactEditor.focus(editor);
      },
    }),
    [editor]
  );

  const modifiers = useModifiers();

  const myRenderLeaf = ({ children, attributes, leaf }) => {
    // Recursively wrap the children for each modifier
    // Using reduce to avoid mutating the children parameter directly
    const wrappedChildren = modifiers.reduce((currentChildren, modifier) => {
      if (leaf[modifier]) {
        return modifier.renderLeaf(currentChildren);
      }

      return currentChildren;
    }, children);

    return <span {...attributes}>{wrappedChildren}</span>;
  };

  return (
    <>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Flex gap={1}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {label}
            {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
          </Typography>
        </Flex>

        <Slate editor={editor} initialValue={blocksData}>
          <InputWrapper direction="column" alignItems="flex-start">
            <BlocksToolbar />
            <EditorDivider width="100%" />
            <Wrapper>
              <Editable
                readOnly={readOnly}
                style={getEditorStyle(theme)}
                renderElement={renderElement}
                renderLeaf={myRenderLeaf}
              />
            </Wrapper>
          </InputWrapper>
        </Slate>
      </Flex>
      {error && (
        <Box paddingTop={1}>
          <Typography variant="pi" textColor="danger600" data-strapi-field-error>
            {error}
          </Typography>
        </Box>
      )}
    </>
  );
});

BlocksEditor.defaultProps = {
  required: false,
  readOnly: false,
  error: '',
};

BlocksEditor.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
  readOnly: PropTypes.bool,
  error: PropTypes.string,
};

export default BlocksEditor;
