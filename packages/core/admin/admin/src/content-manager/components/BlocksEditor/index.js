import * as React from 'react';

import { Box, Flex, Typography, InputWrapper, Divider } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor } from 'slate';
import { withHistory } from 'slate-history';
import { Slate, withReact, ReactEditor } from 'slate-react';
import styled from 'styled-components';

import Hint from '../Hint';

import BlocksInput from './BlocksInput';
import { withLinks, withStrapiSchema } from './plugins';
import { BlocksToolbar } from './Toolbar';

const TypographyAsterisk = styled(Typography)`
  line-height: 0;
`;

const LabelAction = styled(Box)`
  svg path {
    fill: ${({ theme }) => theme.colors.neutral500};
  }
`;

const EditorDivider = styled(Divider)`
  background: ${({ theme }) => theme.colors.neutral200};
`;

/**
 * Images are void elements. They handle the rendering of their children instead of Slate.
 * See the Slate documentation for more information:
 * - https://docs.slatejs.org/api/nodes/element#void-vs-not-void
 * - https://docs.slatejs.org/api/nodes/element#rendering-void-elements
 *
 * @param {import('slate').Editor} editor
 */
const withImages = (editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  return editor;
};

/**
 * Forces an update of the Slate editor when the value prop changes from outside of Slate.
 * The root cause is that Slate is not a controlled component: https://github.com/ianstormtaylor/slate/issues/4612
 * Why not use JSON.stringify(value) as the key?
 * Because it would force a rerender of the entire editor every time the user types a character.
 * Why not use the entity id as the key, since it's unique for each locale?
 * Because it would not solve the problem when using the "fill in from other locale" feature
 *
 * @param {import('slate').Descendant[]} value
 * @returns {{
 *   key: number,
 *   incrementSlateUpdatesCount: () => void
 * }}
 */
function useResetKey(value) {
  // Keep track how how many times Slate detected a change from a user interaction in the editor
  const slateUpdatesCount = React.useRef(0);
  // Keep track of how many times the value prop was updated, whether from within editor or from outside
  const valueUpdatesCount = React.useRef(0);
  // Use a key to force a rerender of the Slate editor when needed
  const [key, setKey] = React.useState(0);

  React.useEffect(() => {
    valueUpdatesCount.current += 1;

    // If the 2 refs are not equal, it means the value was updated from outside
    if (valueUpdatesCount.current !== slateUpdatesCount.current) {
      // So we change the key to force a rerender of the Slate editor,
      // which will pick up the new value through its initialValue prop
      setKey((previousKey) => previousKey + 1);

      // Then bring the 2 refs back in sync
      slateUpdatesCount.current = valueUpdatesCount.current;
    }
  }, [value]);

  return { key, incrementSlateUpdatesCount: () => (slateUpdatesCount.current += 1) };
}

const BlocksEditor = React.forwardRef(
  (
    { intlLabel, labelAction, name, disabled, required, error, value, onChange, placeholder, hint },
    ref
  ) => {
    const { formatMessage } = useIntl();
    const [editor] = React.useState(() =>
      withReact(withStrapiSchema(withLinks(withImages(withHistory(createEditor())))))
    );

    const label = intlLabel.id
      ? formatMessage(
          { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
          { ...intlLabel.values }
        )
      : name;

    const formattedPlaceholder = placeholder
      ? formatMessage({ id: placeholder.id, defaultMessage: placeholder.defaultMessage })
      : null;

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

    const { key, incrementSlateUpdatesCount } = useResetKey(value);

    const handleSlateChange = (state) => {
      const isAstChange = editor.operations.some((op) => op.type !== 'set_selection');

      if (isAstChange) {
        incrementSlateUpdatesCount();

        onChange({
          target: { name, value: state, type: 'blocks' },
        });
      }
    };

    return (
      <>
        <Flex direction="column" alignItems="stretch" gap={1}>
          <Flex gap={1}>
            <Typography variant="pi" fontWeight="bold" textColor="neutral800">
              {label}
              {required && <TypographyAsterisk textColor="danger600">*</TypographyAsterisk>}
            </Typography>
            {labelAction && <LabelAction paddingLeft={1}>{labelAction}</LabelAction>}
          </Flex>
          <Slate
            editor={editor}
            initialValue={value || [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]}
            onChange={handleSlateChange}
            key={key}
          >
            <InputWrapper direction="column" alignItems="flex-start" height="512px">
              <BlocksToolbar disabled={disabled} />
              <EditorDivider width="100%" />
              <BlocksInput disabled={disabled} placeholder={formattedPlaceholder} />
            </InputWrapper>
          </Slate>
          <Hint hint={hint} name={name} error={error} />
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
  labelAction: null,
  disabled: false,
  required: false,
  error: '',
  value: null,
  placeholder: null,
  hint: null,
};

BlocksEditor.propTypes = {
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  labelAction: PropTypes.element,
  name: PropTypes.string.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.array,
  placeholder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
  }),
  hint: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

export default BlocksEditor;
