import * as React from 'react';

import { Box, Flex, Typography, InputWrapper, Divider } from '@strapi/design-system';
import { prefixFileUrlWithBackendUrl, useLibrary } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { createEditor, Transforms } from 'slate';
import { Slate, withReact, ReactEditor } from 'slate-react';
import styled from 'styled-components';

import BlocksInput from './BlocksInput';
import { blocksData } from './tempSchema';
import { BlocksToolbar } from './Toolbar';

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

const ALLOWED_MEDIA_TYPE = 'images';

const BlocksEditor = React.forwardRef(({ intlLabel, name, readOnly, required, error }, ref) => {
  const { formatMessage } = useIntl();
  const [editor] = React.useState(() => withReact(createEditor()));
  const [mediaLibVisible, setMediaLibVisible] = React.useState(false);
  const { components } = useLibrary();
  const MediaLibraryDialog = components['media-library'];

  const label = intlLabel.id
    ? formatMessage(
        { id: intlLabel.id, defaultMessage: intlLabel.defaultMessage },
        { ...intlLabel.values }
      )
    : name;

  const handleToggleMediaLib = () => setMediaLibVisible((prev) => !prev);

  const insertImages = (images) => {
    images.forEach((img) => {
      const image = { type: 'image', image: img, children: [{ text: '' }] }; // required empty text node as children for void elements such as Image
      Transforms.insertNodes(editor, image);
    });
  };

  const handleSelectAssets = (images) => {
    const formattedImages = images.map((image) => ({
      ...image,
      alternativeText: image.alternativeText || image.name,
      url: prefixFileUrlWithBackendUrl(image.url),
    }));

    insertImages(formattedImages);
    setMediaLibVisible(false);
  };

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

        <Slate editor={editor} initialValue={blocksData}>
          <InputWrapper direction="column" alignItems="flex-start">
            <BlocksToolbar handleImageBlock={setMediaLibVisible} />
            <EditorDivider width="100%" />
            <Wrapper>
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
      {mediaLibVisible && (
        <MediaLibraryDialog
          allowedTypes={[ALLOWED_MEDIA_TYPE]}
          onClose={handleToggleMediaLib}
          onSelectAssets={handleSelectAssets}
        />
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
