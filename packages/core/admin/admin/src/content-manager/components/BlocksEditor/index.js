/* eslint-disable react/prop-types */
import * as React from 'react';

import { Box, Flex, Typography, InputWrapper, Divider } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import styled from 'styled-components';

import { blocksData } from './tempSchema';
import { BlocksToolbar } from './Toolbar';
import Wrapper from './Wrapper';

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const EditorDivider = styled(Divider)`
  background: ${({ theme }) => theme.colors.neutral200};
`;

const style = {
  // The outline style is set on the wrapper with :focus-within
  outline: 'none',
};

const Image = ({ attributes, children, element }) => {
  const { url, alternativeText, width, height } = element.image;

  return (
    <div {...attributes}>
      {children}
      <Box contentEditable={false}>
        <img src={url} alt={alternativeText} width={width} height={height} />
      </Box>
    </div>
  );
};

const Element = (props) => {
  const { attributes, element, children } = props;

  if (element.type === 'heading')
    switch (element.level) {
      case 1:
        return <h1 {...attributes}>{children}</h1>;
      case 2:
        return <h2 {...attributes}>{children}</h2>;
      case 3:
        return <h3 {...attributes}>{children}</h3>;
      case 4:
        return <h4 {...attributes}>{children}</h4>;
      case 5:
        return <h5 {...attributes}>{children}</h5>;
      case 6:
        return <h6 {...attributes}>{children}</h6>;
      default: // do nothing
        return null;
    }
  else
    switch (element.type) {
      case 'link':
        return (
          <a href={element.url} {...attributes}>
            {children}
          </a>
        );
      case 'code':
        return (
          <pre {...attributes}>
            <code>{children}</code>
          </pre>
        );
      case 'quote':
        return <blockquote {...attributes}>{children}</blockquote>;
      case 'list':
        if (element.format === 'ordered') return <ol {...attributes}>{children}</ol>;

        return <ul {...attributes}>{children}</ul>;
      case 'list-item':
        return <li {...attributes}>{children}</li>;
      case 'image':
        return <Image {...props} />;
      default:
        return <p {...attributes}>{children}</p>;
    }
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <del>{children}</del>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  return <span {...attributes}>{children}</span>;
};

const BlocksEditor = React.forwardRef(({ intlLabel, name, readOnly, required, error }, ref) => {
  const { formatMessage } = useIntl();
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

  const renderLeaf = React.useCallback((props) => {
    return <Leaf {...props} />;
  }, []);

  const renderElement = React.useCallback((props) => {
    return <Element {...props} />;
  }, []);

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
                style={style}
                renderElement={renderElement}
                renderLeaf={renderLeaf}
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
