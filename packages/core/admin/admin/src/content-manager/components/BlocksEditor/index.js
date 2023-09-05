import * as React from 'react';

import { Box, Flex, Typography } from '@strapi/design-system';
import { pxToRem } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, Editable, withReact, ReactEditor } from 'slate-react';
import styled from 'styled-components';

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const style = {
  fontSize: pxToRem(14),
};

const initialValue = [
  {
    type: 'paragraph',
    children: [{ text: 'A line of text in a paragraph.' }],
  },
];

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

  return (
    <>
      <Flex direction="column" alignItems="stretch" gap={1}>
        <Flex gap={1}>
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            {label}
            {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
          </Typography>
        </Flex>

        <Slate editor={editor} initialValue={initialValue}>
          <Editable readOnly={readOnly} style={style} />
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
