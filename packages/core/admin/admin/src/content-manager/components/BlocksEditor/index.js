import * as React from 'react';

import { Box, Flex, Typography, InputWrapper, Divider } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor } from 'slate';
import { withHistory } from 'slate-history';
import { Slate, withReact, ReactEditor } from 'slate-react';
import styled from 'styled-components';

import BlocksInput from './BlocksInput';
import { BlocksToolbar } from './Toolbar';

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const EditorDivider = styled(Divider)`
  background: ${({ theme }) => theme.colors.neutral200};
`;

const Wrapper = styled(Box)`
  border-radius: ${({ theme }) => theme.borderRadius};
`;

const BlocksEditor = React.forwardRef(
  ({ intlLabel, name, readOnly, required, error, value, onChange }, ref) => {
    const { formatMessage } = useIntl();
    const [editor] = React.useState(() => withReact(withHistory(createEditor())));

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

    const handleSlateChange = (state) => {
      const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

      if (isAstChange) {
        onChange({
          target: { name, value: state, type: 'blocks' },
        });
      }
    };

    const defaultValue = value || [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

    return (
      <>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Flex gap={1}>
            <Typography variant="pi" fontWeight="bold" textColor="neutral800">
              {label}
              {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
            </Typography>
          </Flex>
          <Slate editor={editor} initialValue={defaultValue} onChange={handleSlateChange}>
            <InputWrapper direction="column" alignItems="flex-start">
              <BlocksToolbar />
              <EditorDivider width="100%" />
              <Wrapper
                width="100%"
                maxHeight="512px"
                overflow="auto"
                paddingTop={3}
                paddingRight={4}
                paddingDown={3}
                paddingLeft={4}
                fontSize={2}
                background="neutral0"
                color="neutral800"
                lineHeight={6}
              >
                <BlocksInput readOnly={readOnly} />
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
  }
);

BlocksEditor.defaultProps = {
  required: false,
  readOnly: false,
  error: '',
  value: null,
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
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array,
};

export default BlocksEditor;
